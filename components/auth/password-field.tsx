"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ChangeEvent, useId, useState } from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  autoFocus?: boolean;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  autoFocus,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Masquer le mot de passe" : "Afficher le mot de passe";

  return (
    <div className="field password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          type={visible ? "text" : "password"}
          minLength={8}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
