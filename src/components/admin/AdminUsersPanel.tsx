import { useState, useEffect, FormEvent } from 'react';
import { UserPlus, AlertTriangle, Loader2, Shield, Camera, Upload, Sparkles, X } from 'lucide-react';
import { 
  fetchAdmins, 
  addAdminUser, 
  removeAdminUser, 
  saveSchoolLogo, 
  subscribeSchoolLogo, 
  saveActiveBannerEvent, 
  subscribeActiveBannerEvent,
  fetchPhotos
} from '../../lib/firebaseService';
import { AdminUser } from '../../types';
import { auth } from '../../lib/firebase';
import { handleUploadImageFile } from './adminUtils';

interface AdminUsersPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function AdminUsersPanel({ onDataChange, refreshKey = 0 }: AdminUsersPanelProps) {
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [fetchingAdmins, setFetchingAdmins] = useState(false);
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Branding states
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [activeBannerEvent, setActiveBannerEventState] = useState<string>('');
  const [uniqueEventsList, setUniqueEventsList] = useState<string[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const loadAdmins = async () => {
    setFetchingAdmins(true);
    try {
      const list = await fetchAdmins();
      setAdminsList(list);
    } catch (err) {
      console.error("Error fetching admins:", err);
    } finally {
      setFetchingAdmins(false);
    }
  };

  const loadUniqueEvents = async () => {
    try {
      const photos = await fetchPhotos();
      const events = Array.from(new Set(photos.map(p => p.title).filter(Boolean)));
      setUniqueEventsList(events);
    } catch (err) {
      console.error("Error loading unique events:", err);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadUniqueEvents();

    const unsubLogo = subscribeSchoolLogo(url => {
      setSchoolLogo(url || '');
    });

    const unsubBanner = subscribeActiveBannerEvent(eventName => {
      setActiveBannerEventState(eventName || '');
    });

    return () => {
      unsubLogo();
      unsubBanner();
    };
  }, [refreshKey]);

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setAddAdminError('');
    const targetEmail = newAdminEmail.trim().toLowerCase();
    if (!targetEmail) return;

    setAddAdminLoading(true);
    try {
      const currentUserEmail = auth.currentUser?.email || 'opadijoadeniyi20@gmail.com';
      await addAdminUser(targetEmail, currentUserEmail);
      setNewAdminEmail('');
      loadAdmins();
      onDataChange();
    } catch (err: any) {
      console.error("Error adding admin:", err);
      setAddAdminError(err.message || "Failed to authorize email.");
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (emailToRemove === 'opadijoadeniyi20@gmail.com') {
      alert("The primary administrator account ('opadijoadeniyi20@gmail.com') cannot be removed.");
      return;
    }
    if (!confirm(`Are you sure you want to remove administrator privileges from ${emailToRemove}?`)) {
      return;
    }
    try {
      await removeAdminUser(emailToRemove);
      loadAdmins();
      onDataChange();
    } catch (err: any) {
      console.error("Error removing admin:", err);
      alert(err.message || "Failed to revoke admin privileges.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-0 h-full">
      {/* LEFT PANEL: ADD ADMIN & SCHOOL BRAND */}
      <div className="w-full md:w-1/2 space-y-6">
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Authorize New Administrator</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed text-left">
            Enter any Google (Gmail) address below to authorize admin dashboard privileges. Authorizing an account lets them manage graduands, superlatives, and photo collections.
          </p>

          <form onSubmit={handleAddAdmin} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Gmail Address</label>
              <input
                type="email"
                required
                placeholder="e.g. classmate@gmail.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
              />
            </div>

            {addAdminError && (
              <p className="text-red-400 text-xs font-mono font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {addAdminError}
              </p>
            )}

            <button
              type="submit"
              disabled={addAdminLoading}
              className="w-full py-3 bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#0F2557] font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {addAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Authorize Email</span>}
            </button>
          </form>
        </div>

        <div className="bg-[#D4A017]/5 border border-[#D4A017]/15 rounded-2xl p-4 flex gap-3 text-left">
          <Shield className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white mb-1">Security Recommendation</h4>
            <p className="text-[11px] text-white/70 leading-relaxed">
              Only authorize trusted emails. All authorized Gmails get full unrestricted database read/write permissions.
            </p>
          </div>
        </div>

        {/* SCHOOL BRAND SETTINGS */}
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">School Brand Settings</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Upload the official school logo here. It will replace the default text indicators across headers, landing pages, and footers.
          </p>

          <div className="space-y-4 pt-2">
            <div className="relative border-2 border-dashed border-[#D4A017]/30 hover:border-[#D4A017] rounded-2xl p-4 transition-all text-center bg-black/20">
              {schoolLogo ? (
                <div className="space-y-2">
                  <img src={schoolLogo} className="w-16 h-16 object-contain rounded-lg border border-white/10 mx-auto" referrerPolicy="no-referrer" />
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to revert to the default text badges?")) {
                          setTabLoading(true);
                          try {
                            await saveSchoolLogo('');
                            setSchoolLogo('');
                            onDataChange();
                          } catch (err: any) {
                            alert(err.message || "Failed to reset logo.");
                          } finally {
                            setTabLoading(false);
                          }
                        }
                      }}
                      className="text-[10px] text-red-400 hover:underline font-mono uppercase font-bold cursor-pointer"
                    >
                      Revert to Default
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  {tabLoading ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Loader2 className="w-6 h-6 text-[#D4A017] animate-spin" />
                      <span className="text-[10px] font-semibold text-white/60">Uploading logo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/40">
                      <Upload size={20} className="text-[#D4A017] mb-1.5 mx-auto" />
                      <span className="text-xs font-bold text-white/80">Upload official logo</span>
                      <span className="text-[9px]">Max 5MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setTabLoading(true);
                          const url = await handleUploadImageFile(file);
                          await saveSchoolLogo(url);
                          setSchoolLogo(url);
                          onDataChange();
                        } catch (err: any) {
                          alert(err.message || "Failed to upload logo.");
                        } finally {
                          setTabLoading(false);
                        }
                      }
                    }}
                    disabled={tabLoading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* WEBSITE BANNER PREVIEW SETTING */}
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Homepage Banner Event</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Select which event album photos should be featured in the homepage's scrolling banner marquee. If "Latest Event (Automatic)" is selected, the banner will automatically show photos from the event that was uploaded last.
          </p>

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1 font-bold">Active Event Preview</label>
            <select
              value={activeBannerEvent}
              onChange={async (e) => {
                const val = e.target.value;
                setTabLoading(true);
                try {
                  await saveActiveBannerEvent(val);
                  setActiveBannerEventState(val);
                  onDataChange();
                } catch (err: any) {
                  alert(err.message || "Failed to save banner event setting.");
                } finally {
                  setTabLoading(false);
                }
              }}
              disabled={tabLoading}
              className="w-full px-4 py-3 bg-black/40 border border-[#D4A017]/30 hover:border-[#D4A017] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white cursor-pointer"
            >
              <option value="" className="bg-[#050E22] text-white">Latest Event (Automatic)</option>
              {uniqueEventsList.map(eventTitle => (
                <option key={eventTitle} value={eventTitle} className="bg-[#050E22] text-white">
                  {eventTitle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: CURRENT ADMINS LIST */}
      <div className="w-full md:w-1/2 flex flex-col bg-[#050E22]/20 border border-white/5 p-6 rounded-2xl overflow-y-visible md:overflow-y-auto text-left">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Authorized Administrators</h3>
          </div>
        </div>

        <div className="space-y-3 flex-grow overflow-y-visible md:overflow-y-auto">
          {/* Super Admin Immutable */}
          <div className="bg-[#050E22]/50 border-2 border-[#D4A017]/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white font-mono">opadijoadeniyi20@gmail.com</p>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4A017] font-bold">Primary Super Admin</span>
            </div>
            <span className="px-2 py-1 bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold">Immutable</span>
          </div>

          {fetchingAdmins ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-[#D4A017] animate-spin" />
            </div>
          ) : (
            adminsList
              .filter(admin => admin.email !== 'opadijoadeniyi20@gmail.com')
              .map(admin => (
                <div key={admin.email} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white font-mono">{admin.email}</p>
                    <p className="text-[9px] text-white/40 font-mono mt-0.5">
                      Added {new Date(admin.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdmin(admin.email)}
                    className="p-2 hover:bg-rose-500/15 text-rose-400 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
