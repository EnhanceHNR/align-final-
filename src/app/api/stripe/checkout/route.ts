import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // In a real app, instantiate Stripe and create a Checkout Session here.
  // Redirecting to dashboard as a mock for now.
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
