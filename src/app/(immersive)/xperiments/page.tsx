import { redirect } from "next/navigation";

// /xperiments exists in the naming but has no index of its own — the demos live
// at /xperiments/*. Send it to the Merge index that lists them instead of 404ing.
export default function XperimentsIndex() {
  redirect("/graphic-designs");
}
