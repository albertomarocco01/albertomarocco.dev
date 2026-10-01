import { Fraunces, JetBrains_Mono } from "next/font/google";

// Shared by the two documents the app renders: the [locale] root layout and
// global-not-found, which bypasses every layout and so brings its own fonts.

// Distinctive display serif — variable, with italic + optical size. Not Inter.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// A real mono, self-hosted, so the site's whole meta/nav/ticker/loader register
// looks identical on every OS instead of degrading to Consolas/SF Mono/Android
// mono. Variable weight axis — no `weight` needed.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

/** The `<html>` class that exposes both families as CSS variables. */
export const FONT_VARIABLES = `${fraunces.variable} ${jetbrainsMono.variable}`;
