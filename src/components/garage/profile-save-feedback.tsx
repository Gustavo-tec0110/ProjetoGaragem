"use client";

import * as React from "react";

const PROFILE_SAVED_KEY = "projeto-garagem:profile-saved";
const PROFILE_SAVED_EVENT = "projeto-garagem:profile-saved";

export function announceProfileSaved() {
  window.sessionStorage.setItem(PROFILE_SAVED_KEY, "1");
  window.dispatchEvent(new Event(PROFILE_SAVED_EVENT));
}

export function ProfileSaveFeedback() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const show = () => { window.sessionStorage.removeItem(PROFILE_SAVED_KEY); setVisible(true); };
    if (window.sessionStorage.getItem(PROFILE_SAVED_KEY) === "1") show();
    window.addEventListener(PROFILE_SAVED_EVENT, show);
    return () => window.removeEventListener(PROFILE_SAVED_EVENT, show);
  }, []);
  React.useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => setVisible(false), 5_000);
    return () => window.clearTimeout(timeout);
  }, [visible]);
  if (!visible) return null;
  return <p role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-xl border border-success/30 bg-card px-4 py-3 text-sm text-success shadow-elevated">Perfil atualizado.</p>;
}
