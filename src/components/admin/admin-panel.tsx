"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  LocateFixed,
  LockKeyhole,
  LogOut,
  MapPin,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import locationPresets from "@/data/location-presets.json";
import type { MapLocation } from "@/lib/map-location";
import type { SiteNotification } from "@/lib/site-notification";

type AdminStatus = "signed-out" | "signed-in";
type LocationPreset = (typeof locationPresets)[number];

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function AdminPanel() {
  const [status, setStatus] = useState<AdminStatus>("signed-out");
  const [password, setPassword] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceEndsAt, setMaintenanceEndsAt] = useState<string | null>(null);
  const [maintenanceEndsAtDraft, setMaintenanceEndsAtDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAwaitingCity, setIsAwaitingCity] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [notifications, setNotifications] = useState<SiteNotification[]>([]);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loginError, setLoginError] = useState("");
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceNotice, setMaintenanceNotice] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const cityInputRef = useRef<HTMLInputElement>(null);
  const needsCityName = isAwaitingCity && !city.trim();

  useEffect(() => {
    if (isAwaitingCity) cityInputRef.current?.focus({ preventScroll: true });
  }, [isAwaitingCity]);

  const loadSettings = async (adminPassword: string) => {
    const response = await fetch("/api/admin/settings", {
      headers: { "x-admin-password": adminPassword },
      cache: "no-store",
    });
    const data = (await response.json()) as {
      maintenance?: boolean;
      maintenanceEndsAt?: string | null;
      locations?: MapLocation[];
      notifications?: SiteNotification[];
      error?: string;
    };
    if (
      !response.ok ||
      typeof data.maintenance !== "boolean" ||
      (data.maintenanceEndsAt !== null &&
        typeof data.maintenanceEndsAt !== "string") ||
      !Array.isArray(data.locations) ||
      data.locations.length === 0 ||
      !Array.isArray(data.notifications)
    ) {
      throw new Error(data.error ?? "Could not load settings.");
    }
    setMaintenance(data.maintenance);
    setMaintenanceEndsAt(data.maintenanceEndsAt ?? null);
    setMaintenanceEndsAtDraft(
      data.maintenanceEndsAt ? toLocalDateTimeInput(data.maintenanceEndsAt) : ""
    );
    setLocations(data.locations);
    setNotifications(data.notifications);
    setSelectedPersonId(data.locations[0].id);
    setCity(data.locations[0].city);
    setLatitude(String(data.locations[0].coords[0]));
    setLongitude(String(data.locations[0].coords[1]));
    setStatus("signed-in");
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setLoginError(data.error ?? "Sign-in failed.");
        return;
      }
      await loadSettings(password);
      setStatus("signed-in");
    } catch (loadError) {
      setLoginError(loadError instanceof Error ? loadError.message : "Could not load settings.");
    }
  };

  const updateMaintenance = async (nextValue: boolean) => {
    setIsSaving(true);
    setMaintenanceError("");
    setMaintenanceNotice("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ maintenance: nextValue }),
      });
      const data = (await response.json()) as { maintenance?: boolean; error?: string };
      if (!response.ok || typeof data.maintenance !== "boolean") {
        throw new Error(data.error ?? "Could not save settings.");
      }
      setMaintenance(data.maintenance);
      setMaintenanceNotice("Settings saved. The website will use this mode on the next page request.");
    } catch (saveError) {
      setMaintenanceError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveMaintenanceEndTime = async () => {
    setMaintenanceError("");
    setMaintenanceNotice("");
    let nextEndsAt: string | null = null;
    if (maintenanceEndsAtDraft) {
      const endTimestamp = new Date(maintenanceEndsAtDraft).getTime();
      if (!Number.isFinite(endTimestamp) || endTimestamp <= Date.now()) {
        setMaintenanceError("Choose a future date and time.");
        return;
      }
      nextEndsAt = new Date(endTimestamp).toISOString();
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ maintenanceEndsAt: nextEndsAt }),
      });
      const data = (await response.json()) as {
        maintenanceEndsAt?: string | null;
        error?: string;
      };
      if (
        !response.ok ||
        (data.maintenanceEndsAt !== null &&
          typeof data.maintenanceEndsAt !== "string")
      ) {
        throw new Error(data.error ?? "Could not save the maintenance end time.");
      }
      setMaintenanceEndsAt(data.maintenanceEndsAt ?? null);
      setMaintenanceEndsAtDraft(
        data.maintenanceEndsAt ? toLocalDateTimeInput(data.maintenanceEndsAt) : ""
      );
      setMaintenanceNotice(
        data.maintenanceEndsAt
          ? "Maintenance countdown saved. The website will remain in maintenance mode until you turn it off."
          : "Maintenance countdown cleared."
      );
    } catch (saveError) {
      setMaintenanceError(
        saveError instanceof Error ? saveError.message : "Could not save the maintenance end time."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotifications = async (nextNotifications: SiteNotification[]) => {
    setIsSavingNotification(true);
    setNotificationError("");
    setNotificationNotice("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ notifications: nextNotifications }),
      });
      const data = (await response.json()) as {
        notifications?: SiteNotification[];
        error?: string;
      };
      if (!response.ok || !Array.isArray(data.notifications)) {
        throw new Error(data.error ?? "Could not save notifications.");
      }
      setNotifications(data.notifications);
      setNotificationNotice("Notifications saved and published.");
      return true;
    } catch (saveError) {
      setNotificationError(
        saveError instanceof Error ? saveError.message : "Could not save notifications."
      );
      return false;
    } finally {
      setIsSavingNotification(false);
    }
  };

  const createNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = notificationTitle.trim().normalize("NFC");
    const message = notificationMessage.trim().normalize("NFC");
    if (!title || !message) {
      setNotificationError("Enter both a title and a message.");
      return;
    }
    if (notifications.length >= 100) {
      setNotificationError("The notification list is full. Delete an old notification first.");
      return;
    }

    const notification: SiteNotification = {
      id: crypto.randomUUID(),
      title,
      message,
      createdAt: new Date().toISOString(),
    };
    if (await saveNotifications([notification, ...notifications])) {
      setNotificationTitle("");
      setNotificationMessage("");
    }
  };

  const deleteNotification = async (id: string) => {
    await saveNotifications(notifications.filter((notification) => notification.id !== id));
  };

  const selectPerson = (location: MapLocation) => {
    setSelectedPersonId(location.id);
    setCity(location.city);
    setLatitude(String(location.coords[0]));
    setLongitude(String(location.coords[1]));
    setIsAwaitingCity(false);
    setLocationError("");
    setLocationNotice("");
  };

  const applyPreset = (preset: LocationPreset) => {
    setCity(preset.city);
    setLatitude(String(preset.coords[0]));
    setLongitude(String(preset.coords[1]));
    setIsAwaitingCity(false);
    setLocationError("");
    setLocationNotice("");
  };

  const useCurrentLocation = () => {
    setLocationError("");
    setLocationNotice("");
    if (!navigator.geolocation) {
      setLocationError("Location access is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(String(coords.latitude));
        setLongitude(String(coords.longitude));
        setCity("");
        setIsAwaitingCity(true);
        setIsLocating(false);
      },
      (locationError) => {
        const message =
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. Allow access in your browser and try again."
            : locationError.code === locationError.TIMEOUT
              ? "Could not get your location in time. Please try again."
              : "Could not get your current location.";
        setLocationError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const saveLocation = async () => {
    setLocationError("");
    setLocationNotice("");
    if (!city.trim() || !latitude.trim() || !longitude.trim()) {
      setLocationError("Enter a city and both coordinates.");
      return;
    }

    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    if (
      !Number.isFinite(latitudeValue) ||
      latitudeValue < -90 ||
      latitudeValue > 90 ||
      !Number.isFinite(longitudeValue) ||
      longitudeValue < -180 ||
      longitudeValue > 180
    ) {
      setLocationError("Enter valid coordinates (latitude -90 to 90, longitude -180 to 180).");
      return;
    }

    const coords: [number, number] = [latitudeValue, longitudeValue];
    const nextLocations = locations.map((location) =>
      location.id === selectedPersonId
        ? { ...location, city: city.trim(), coords }
        : location
    );

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ locations: nextLocations }),
      });
      const data = (await response.json()) as { locations?: MapLocation[]; error?: string };
      if (!response.ok || !Array.isArray(data.locations)) {
        throw new Error(data.error ?? "Could not save location.");
      }
      setLocations(data.locations);
      setIsAwaitingCity(false);
      const savedLocation = data.locations.find((location) => location.id === selectedPersonId);
      if (savedLocation) {
        setCity(savedLocation.city);
        setLatitude(String(savedLocation.coords[0]));
        setLongitude(String(savedLocation.coords[1]));
      }
      setLocationNotice("Location saved. The map will use it on the next page request.");
    } catch (saveError) {
      setLocationError(saveError instanceof Error ? saveError.message : "Could not save location.");
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    setPassword("");
    setMaintenanceEndsAt(null);
    setMaintenanceEndsAtDraft("");
    setLocations([]);
    setNotifications([]);
    setSelectedPersonId("");
    setStatus("signed-out");
    setMaintenanceNotice("");
    setMaintenanceError("");
    setLocationNotice("");
    setLocationError("");
    setNotificationError("");
    setNotificationNotice("");
    setLoginError("");
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="admin-brand" href="/">ours<span>.</span></Link>
        <div className="admin-header-actions">
          {status === "signed-in" && <span className="admin-header-label">Control panel</span>}
          {status === "signed-in" && (
            <button type="button" className="admin-logout" onClick={signOut}>
              <LogOut size={16} /> Sign out
            </button>
          )}
        </div>
      </header>
      {status === "signed-out" ? (
        <section className="admin-card admin-login-card">
          <div className="admin-icon"><LockKeyhole size={22} /></div>
          <p className="admin-eyebrow">Private area</p>
          <h1>Admin sign in</h1>
          <p className="admin-muted">Use the same password as the Letters section.</p>
          <form className="admin-login-form" onSubmit={signIn}>
            <label htmlFor="admin-password">Password</label>
            <input
              autoComplete="current-password"
              id="admin-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
              required
            />
            <button type="submit" className="admin-primary-button">Continue</button>
          </form>
          {loginError && <p className="admin-error" role="alert">{loginError}</p>}
        </section>
      ) : (
        <div className="admin-main">
          <div className="admin-page-intro">
            <p className="admin-eyebrow">Website settings</p>
            <h1>Your little control room</h1>
            <p className="admin-muted">A few simple switches to keep your corner of the internet just right.</p>
          </div>
          <div className="admin-settings-grid">
            <section className="admin-card admin-maintenance-card" aria-labelledby="maintenance-title">
              <div className="admin-section-heading">
                <div className="admin-icon"><Settings2 size={20} /></div>
                <div>
                  <p className="admin-eyebrow">Site availability</p>
                  <h2 id="maintenance-title">Maintenance mode</h2>
                </div>
              </div>
              <p className="admin-muted">
                {maintenance
                  ? "Your visitors are seeing the maintenance page while you make updates."
                  : "Your website is live and ready for visitors."}
              </p>
              <div className="admin-maintenance-control">
                <span className={`admin-status-pill ${maintenance ? "is-maintenance" : "is-live"}`}>
                  <span />
                  {maintenance ? "Maintenance on" : "Website live"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenance}
                  aria-label="Maintenance mode"
                  className={`admin-switch ${maintenance ? "is-on" : ""}`}
                  disabled={isSaving}
                  onClick={() => void updateMaintenance(!maintenance)}
                >
                  <span />
                </button>
              </div>
              <div className="admin-maintenance-schedule">
                <label htmlFor="maintenance-ends-at">Expected maintenance end</label>
                <input
                  id="maintenance-ends-at"
                  type="datetime-local"
                  min={toLocalDateTimeInput(new Date().toISOString())}
                  value={maintenanceEndsAtDraft}
                  onChange={(event) => {
                    setMaintenanceEndsAtDraft(event.target.value);
                    setMaintenanceError("");
                    setMaintenanceNotice("");
                  }}
                  disabled={isSaving}
                />
                <p className="admin-muted">
                  Leave empty to hide the countdown. Time is shown in your local timezone; maintenance will not turn off automatically.
                </p>
                <button
                  type="button"
                  className="admin-secondary-button admin-maintenance-save"
                  onClick={() => void saveMaintenanceEndTime()}
                  disabled={isSaving}
                >
                  <Save size={15} />
                  {isSaving ? "Saving..." : "Save countdown"}
                </button>
                {maintenanceEndsAt && (
                  <span className="admin-schedule-current">
                    Current end: {new Date(maintenanceEndsAt).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="admin-connection"><ShieldCheck size={16} /> Connected to Supabase</div>
              {(maintenanceError || maintenanceNotice) && (
                <div
                  className={`admin-feedback ${maintenanceError ? "is-error" : "is-success"}`}
                  role={maintenanceError ? "alert" : "status"}
                >
                  {maintenanceError || maintenanceNotice}
                </div>
              )}
            </section>

            <section className="admin-card admin-location-settings" aria-labelledby="admin-location-title">
              <div className="admin-section-heading">
                <div className="admin-icon"><MapPin size={20} /></div>
                <div>
                  <p className="admin-eyebrow">Map settings</p>
                  <h2 id="admin-location-title">Your locations</h2>
                </div>
              </div>
              <p className="admin-muted">
                Choose who to update, then pick a city or enter coordinates for the map.
              </p>
              <div className="admin-person-picker" aria-label="Choose a person">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    className={`admin-person-option ${selectedPersonId === location.id ? "is-selected" : ""}`}
                    aria-pressed={selectedPersonId === location.id}
                    onClick={() => selectPerson(location)}
                  >
                    {location.name}
                  </button>
                ))}
              </div>
              <div className="admin-location-editor">
                <div className="admin-editor-label">
                  <span>Choose a preset</span>
                  <span className="admin-editor-hint">Or enter a custom position below</span>
                </div>
                <div className="admin-location-presets" aria-label="Available location presets">
                  {locationPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="admin-preset-button"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="admin-coordinate-fields">
                  <label>
                    City or area
                    <input
                      ref={cityInputRef}
                      required
                      aria-describedby={needsCityName ? "admin-city-hint" : undefined}
                      placeholder={needsCityName ? "Enter the city or area name" : undefined}
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                    {needsCityName && (
                      <span className="admin-city-hint" id="admin-city-hint">
                        Please enter the city or area for these coordinates.
                      </span>
                    )}
                  </label>
                  <label>
                    Latitude
                    <input
                      inputMode="decimal"
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      inputMode="decimal"
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                    />
                  </label>
                </div>
                <div className="admin-location-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    disabled={isSaving || isLocating}
                    onClick={useCurrentLocation}
                  >
                    <LocateFixed size={16} />
                    {isLocating ? "Finding location..." : "Use current location"}
                  </button>
                  <button
                    type="button"
                    className="admin-primary-button"
                    disabled={isSaving || isLocating || !selectedPersonId}
                    onClick={() => void saveLocation()}
                  >
                    <Save size={16} />
                    {isSaving ? "Saving..." : "Save location"}
                  </button>
                </div>
                {(locationError || locationNotice) && (
                  <div
                    className={`admin-feedback ${locationError ? "is-error" : "is-success"}`}
                    role={locationError ? "alert" : "status"}
                  >
                    {locationError || locationNotice}
                  </div>
                )}
              </div>
              <div className="admin-connection"><ShieldCheck size={16} /> Location is saved securely in Supabase</div>
            </section>

            <section className="admin-card admin-notification-settings" aria-labelledby="admin-notification-title">
              <div className="admin-section-heading">
                <div className="admin-icon"><Bell size={20} /></div>
                <div>
                  <p className="admin-eyebrow">Share an update</p>
                  <h2 id="admin-notification-title">Notifications</h2>
                </div>
              </div>
              <p className="admin-muted">
                Publish a short message for visitors. Their notification bell will show a dot until they open it.
              </p>
              <form className="admin-notification-form" onSubmit={createNotification}>
                <label>
                  Title
                  <input
                    maxLength={120}
                    value={notificationTitle}
                    onChange={(event) => setNotificationTitle(event.target.value)}
                    placeholder="A little update"
                    required
                  />
                </label>
                <label>
                  Message
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={notificationMessage}
                    onChange={(event) => setNotificationMessage(event.target.value)}
                    placeholder="Write your announcement..."
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={isSavingNotification}
                >
                  <Bell size={15} />
                  {isSavingNotification ? "Publishing..." : "Publish notification"}
                </button>
              </form>
              {(notificationError || notificationNotice) && (
                <div
                  className={`admin-feedback ${notificationError ? "is-error" : "is-success"}`}
                  role={notificationError ? "alert" : "status"}
                >
                  {notificationError || notificationNotice}
                </div>
              )}
              <div className="admin-notification-list-heading">
                <strong>Published</strong>
                <span>{notifications.length} / 100</span>
              </div>
              {notifications.length > 0 ? (
                <div className="admin-notification-list">
                  {notifications.map((notification) => (
                    <article className="admin-notification-item" key={notification.id}>
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <time dateTime={notification.createdAt}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <button
                        type="button"
                        className="admin-notification-delete"
                        aria-label={`Delete ${notification.title}`}
                        title="Delete notification"
                        disabled={isSavingNotification}
                        onClick={() => void deleteNotification(notification.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="admin-notification-empty">No notifications published yet.</p>
              )}
              <div className="admin-connection"><ShieldCheck size={16} /> Notifications are stored in Supabase</div>
            </section>
          </div>
        </div>
      )}
      <footer className="admin-footer">ours. <span>·</span> made with love</footer>
    </main>
  );
}
