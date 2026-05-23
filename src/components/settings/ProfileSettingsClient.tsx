"use client";

import { useState } from "react";
import { Input, Button, Modal, useToast } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProfileSettingsClientProps {
  email: string;
  name: string;
}

export function ProfileSettingsClient({ email, name }: ProfileSettingsClientProps) {
  const { success, error: showError } = useToast();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      showError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      success("Password updated");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      showError(e.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
        Your account
      </h2>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <Input
          label="Full name"
          value={name}
          disabled
          helper="Name is set from your sign-up information"
        />
        <Input
          label="Email"
          value={email}
          disabled
          helper="Email is managed through your authentication provider"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Password</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Change your sign-in password
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
          >
            Change password
          </Button>
        </div>
      </div>

      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change password"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="New password"
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              size="md"
              className="flex-1"
              loading={saving}
              onClick={handleChangePassword}
            >
              Update password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
