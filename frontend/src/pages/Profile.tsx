import { useState } from "react";
import { Camera, Save, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { useToast } from "../components/ToastProvider";

function Profile() {
  const user: any = JSON.parse(localStorage.getItem("user") || "{}");
  const [profile, setProfile] = useState({
    name: user.name || "User",
    email: user.email || "",
    phone: user.phone || "",
    about: user.about || "",
    image: user.image || "",
    joined: user.created_at || new Date().toLocaleDateString(),
    subscription: user.subscription || "Free",
  });
  const { notify } = useToast();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  function imageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfile({
          ...profile,
          image: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  function saveProfile() {
    const updatedUser = {
      ...user,
      ...profile,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    notify({
      title: "Profile saved",
      description: "Your profile details were updated successfully.",
      variant: "success",
    });
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Profile"
        title="Profile"
        description="Manage your personal account and identity settings."
        action={<span className="inline-flex items-center gap-2"><Sparkles size={16} />{profile.subscription}</span>}
      />

      <Card className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            {profile.image ? (
              <img src={profile.image} className="h-24 w-24 rounded-full object-cover" alt="Profile" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-4xl font-semibold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{profile.name}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{profile.email}</p>
              <p className="mt-2 inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">{profile.subscription} plan</p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
            <Camera size={16} />
            Upload photo
            <input type="file" className="hidden" onChange={imageUpload} accept="image/*" />
          </label>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Full name
              <input name="name" value={profile.name} onChange={handleChange} className="input-field mt-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
              <input name="email" value={profile.email} onChange={handleChange} className="input-field mt-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Phone
              <input name="phone" value={profile.phone} onChange={handleChange} className="input-field mt-2" />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              About
              <textarea
                name="about"
                value={profile.about}
                onChange={handleChange}
                className="input-field mt-2 min-h-[120px] resize-none"
              />
            </label>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-white">Account details</p>
              <p className="mt-2">Joined {profile.joined}</p>
              <p className="mt-1">Subscription: {profile.subscription}</p>
            </div>
            <button onClick={saveProfile} className="btn-primary w-full">
              <Save size={18} />
              Save Profile
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Profile;
