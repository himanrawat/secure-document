"use client";



import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import toast from "react-hot-toast";
import {
  DocumentPermissions,
  DocumentSecurityPolicy,
  ViewerIdentityRequirement,
  securityLevels,
} from "@/lib/types/security";
import { RichTextEditor } from "@/components/dashboard/RichTextEditor";
import { RICHTEXT_PLACEHOLDER } from "@/lib/constants";



export type DashboardDocument = {
  documentId: string;
  title: string;
  description: string;
  createdAt?: string;
  fileName?: string;
  fileUrl?: string | null;
  richText?: string;
  permissions: DocumentPermissions;
  policies?: DocumentSecurityPolicy;
  identityRequirement?: ViewerIdentityRequirement;
  otp?: string;
};


type Props = {

  onCreated: (doc: DashboardDocument) => void;

};



const defaultPermissions: DocumentPermissions = {

  maxViews: 3,

  expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),

  allowedDevices: [],

  securityLevel: "HIGH",

  maxSessionMinutes: 20,

  maxConcurrentSessions: 1,

  allowOffline: false,

};



const defaultPolicies: DocumentSecurityPolicy = {
  cameraEnforcement: true,
  watermarking: true,
  screenShield: true,
  downloadDisabled: true,
  multiMonitorBlock: true,
  deviceLock: true,
  ipRestriction: "",
  locationTracking: true,
};

const defaultIdentityRequirement: ViewerIdentityRequirement = {
  required: false,
  expectedName: "",
  expectedPhone: "",
  enforceMatch: false,
};

type BooleanPolicyKey = Exclude<keyof DocumentSecurityPolicy, "ipRestriction">;

export function DocumentBuilder({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [otp, setOtp] = useState("");
  const [richText, setRichText] = useState("");
  const [permissions, setPermissions] = useState<DocumentPermissions>({ ...defaultPermissions });
  const [policies, setPolicies] = useState<DocumentSecurityPolicy>({ ...defaultPolicies });
  const [identityRequirement, setIdentityRequirement] = useState<ViewerIdentityRequirement>({
    ...defaultIdentityRequirement,
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const policyToggles = useMemo<{ key: BooleanPolicyKey; label: string }[]>(
    () => [
      { key: "cameraEnforcement", label: "Camera enforcement" },
      { key: "watermarking", label: "Watermark overlay" },
      { key: "screenShield", label: "Screen shield + blur" },
      { key: "downloadDisabled", label: "Disable download" },
      { key: "multiMonitorBlock", label: "Block extra monitors" },
      { key: "deviceLock", label: "Device fingerprint lock" },
      { key: "locationTracking", label: "Location capture" },
    ],
    [],
  );

  const handlePolicyToggle =
    (key: BooleanPolicyKey) => (event: ChangeEvent<HTMLInputElement>) => {
      setPolicies((prev) => ({ ...prev, [key]: event.target.checked }));
    };

  const handleIdentityToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const required = event.target.checked;
    setIdentityRequirement((prev) => ({
      ...prev,
      required,
      enforceMatch: required ? prev.enforceMatch : false,
    }));
  };

  const handleIdentityField =
    (field: "expectedName" | "expectedPhone") => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setIdentityRequirement((prev) => ({ ...prev, [field]: value }));
    };

  const handleEnforceMatch = (event: ChangeEvent<HTMLInputElement>) => {
    setIdentityRequirement((prev) => ({ ...prev, enforceMatch: event.target.checked }));
  };


  const generateOtp = () => {

    const code = nanoid(6).toUpperCase();

    setOtp(code);

    toast.success(`OTP ${code} generated.`);

  };



  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!otp) {

      toast.error("Generate an OTP before publishing.");

      return;

    }

    const parseJsonResponse = async (response: Response) => {
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    try {
      setSubmitting(true);
      const formData = new FormData();

      formData.append("title", title);

      formData.append("description", description);

      formData.append("otp", otp);

      if (richText.trim().length > 0) {
        formData.append("richText", richText);
      }
      formData.append("permissions", JSON.stringify(permissions));
      formData.append("policies", JSON.stringify(policies));
      formData.append("identityRequirement", JSON.stringify(identityRequirement));
      if (file) {

        formData.append("file", file);

      }

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to create document");
      }
      if (!data?.document) {
        throw new Error("Missing response payload");
      }
      onCreated(data.document);
      toast.success("Document secured and published.");

      setTitle("");

      setDescription("");

      setFile(null);
      setOtp("");
      setPermissions({ ...defaultPermissions });
      setPolicies({ ...defaultPolicies });
      setIdentityRequirement({ ...defaultIdentityRequirement });
      setRichText("");
    } catch (error) {

      const message = error instanceof Error ? error.message : "Unable to create document";

      toast.error(message);

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <form onSubmit={handleSubmit} className="space-y-6">

      <div className="grid gap-4 lg:grid-cols-2">

        <div className="space-y-3">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Title</label>

          <input

            value={title}

            onChange={(event) => setTitle(event.target.value)}

            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"

            required

          />

        </div>

        <div className="space-y-3">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Description</label>

          <input

            value={description}

            onChange={(event) => setDescription(event.target.value)}

            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"

          />

        </div>

      </div>



      <div className="space-y-3">

        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Rich text payload</label>

        <RichTextEditor value={richText} onChange={setRichText} />

      </div>



      <div className="grid gap-4 lg:grid-cols-2">

        <div className="space-y-2">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Upload File</label>

          <input

            type="file"

            onChange={(event) => setFile(event.target.files?.[0] ?? null)}

            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900"

          />

          <p className="text-xs text-slate-400">Optional. Rich text + file can ship together.</p>

        </div>

        <div className="space-y-2">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">OTP</label>

          <div className="flex gap-3">

            <input

              value={otp}

              onChange={(event) => setOtp(event.target.value.toUpperCase())}

              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg uppercase tracking-[0.3em] text-white focus:border-cyan-400 focus:outline-none"

              required

            />

            <button

              type="button"

              onClick={generateOtp}

              className="rounded-2xl border border-cyan-400/40 px-4 py-3 text-sm font-semibold text-white"

            >

              Generate

            </button>

          </div>

        </div>

      </div>

      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Viewer identity</p>
            <p className="text-sm text-slate-300">
              Capture reader name/phone before the document loads. Enforce matching if you expect someone
              specific.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-white">
            <span>Required</span>
            <input
              type="checkbox"
              checked={identityRequirement.required}
              onChange={handleIdentityToggle}
              className="size-5 accent-cyan-400"
            />
          </label>
        </div>
        {identityRequirement.required && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Expected name</label>
              <input
                value={identityRequirement.expectedName ?? ""}
                onChange={handleIdentityField("expectedName")}
                placeholder="Optional: e.g. Alex Doe"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Expected phone</label>
              <input
                value={identityRequirement.expectedPhone ?? ""}
                onChange={handleIdentityField("expectedPhone")}
                placeholder="Optional: +1 555 123 4567"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
            </div>
            <label className="col-span-full flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
              <span>Viewer must match provided identity</span>
              <input
                type="checkbox"
                className="size-5 accent-cyan-400"
                checked={identityRequirement.enforceMatch ?? false}
                onChange={handleEnforceMatch}
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Max Views</label>

          <input

            type="number"

            min={1}

            value={permissions.maxViews}

            onChange={(event) =>

              setPermissions((prev) => ({ ...prev, maxViews: Number(event.target.value) }))

            }

            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"

          />

        </div>

        <div className="space-y-2">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Expires</label>

          <input

            type="datetime-local"

            value={permissions.expiryDate ? permissions.expiryDate.slice(0, 16) : ""}

            onChange={(event) =>

              setPermissions((prev) => ({ ...prev, expiryDate: new Date(event.target.value).toISOString() }))

            }

            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"

          />

        </div>

        <div className="space-y-2">

          <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Security Level</label>

          <select
            value={permissions.securityLevel}
            onChange={(event) =>
              setPermissions((prev) => ({
                ...prev,
                securityLevel: event.target.value as DocumentPermissions["securityLevel"],
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
          >
            {securityLevels.map((level) => (

              <option key={level} value={level}>

                {level}

              </option>

            ))}

          </select>

        </div>

      </div>



      <div className="grid gap-4 md:grid-cols-2">

        {policyToggles.map((toggle) => (

          <label

            key={toggle.key}

            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"

          >

            <span>{toggle.label}</span>

              <input
                type="checkbox"
                checked={policies[toggle.key]}
                onChange={handlePolicyToggle(toggle.key)}
                className="size-5 accent-cyan-400"
              />
          </label>

        ))}

      </div>



      <div className="space-y-2">

        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">IP Restriction</label>

        <input

          value={policies.ipRestriction ?? ""}

          onChange={(event) =>

            setPolicies((prev) => ({ ...prev, ipRestriction: event.target.value }))

          }

          placeholder="e.g. 192.168.1.0/24"

          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"

        />

      </div>



      <button

        type="submit"

        disabled={submitting}

        className="w-full rounded-3xl bg-cyan-500 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 disabled:opacity-60"

      >

        {submitting ? "Publishing..." : "Publish Secure Document"}

      </button>

    </form>

  );

}

