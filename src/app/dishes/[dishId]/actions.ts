"use server";
import { revalidatePath } from "next/cache";
import { parseScore } from "@/lib/score";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export type RatingState =
  | { status: "idle" }
  | { status: "saved"; score: string; message: string }
  | { status: "error" | "signed-out"; message: string };

// Creates or updates the caller's rating. The user comes from the verified session inside the database
// function (never from the form); RLS and constraints enforce ownership, active dishes and exact tenths.
export async function saveRating(_previous: RatingState, form: FormData): Promise<RatingState> {
  const dishId = String(form.get("dishId") ?? "");
  if (!isUuid(dishId)) return { status: "error", message: "This dish link isn’t valid." };
  const score = parseScore(form.get("score"));
  if (!score.ok) return { status: "error", message: score.message };
  try {
    const client = await createClient();
    const { data: claims } = await client.auth.getClaims();
    if (!claims?.claims?.sub) return { status: "signed-out", message: "Your session has ended. Sign in again to save your rating." };
    const { error } = await client.rpc("save_rating", { p_dish_id: dishId, p_score: score.value });
    if (error) {
      if (error.code === "42501" && error.message.includes("Sign in")) return { status: "signed-out", message: "Your session has ended. Sign in again to save your rating." };
      if (error.code === "42501") return { status: "error", message: "This dish is no longer on the menu, so it can’t be rated." };
      if (error.code === "23514") return { status: "error", message: "Scores go from 1.0 to 10.0 in steps of 0.1." };
      if (error.code === "23503") return { status: "error", message: "This dish couldn’t be found." };
      return { status: "error", message: "We couldn’t save your rating. Please try again." };
    }
  } catch {
    return { status: "error", message: "We couldn’t reach Forkd. Check your connection and try again." };
  }
  // Fresh aggregates and ranking everywhere this dish appears.
  revalidatePath(`/dishes/${dishId}`);
  revalidatePath("/restaurants/[restaurantId]", "page");
  return { status: "saved", score: score.value, message: `Saved. Your rating: ${score.value}.` };
}
