import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/contact-us/")({
  component: ContactUsPage,
});

function ContactUsPage() {
  return <Navigate to="/book-now" />;
}
