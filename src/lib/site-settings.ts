import siteConfig from "@/data/site-config.json";
import type { MapLocation } from "@/lib/map-location";
import type { SiteNotification } from "@/lib/site-notification";

type SiteSettingsRow = {
  id: number;
  setting: Record<string, unknown>;
};

type SiteSettingsUpdates = {
  maintenance?: boolean;
  maintenanceEndsAt?: string | null;
  locations?: MapLocation[];
  notifications?: SiteNotification[];
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const parsedUrl = new URL(url);
  const settingsPath = /\/rest\/v1\/site_config\/?$/.test(parsedUrl.pathname)
    ? parsedUrl.pathname.replace(/\/$/, "")
    : `${parsedUrl.pathname.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "")}/rest/v1/site_config`;
  parsedUrl.pathname = settingsPath;
  parsedUrl.search = "";
  parsedUrl.hash = "";
  return { url: parsedUrl.toString().replace(/\/$/, ""), serviceKey };
}

function getSupabaseHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function getSiteSettingsRow(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  const response = await fetch(`${config.url}?id=eq.1&select=id,setting`, {
    headers: getSupabaseHeaders(config.serviceKey),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not load site settings from Supabase (HTTP ${response.status}).`);
  }

  const rows = (await response.json()) as SiteSettingsRow[];
  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    typeof rows[0].setting !== "object" ||
    rows[0].setting === null
  ) {
    throw new Error("Supabase site_config must contain one id=1 row with a JSON setting value.");
  }
  return rows[0];
}

export function parseMapLocations(value: unknown): MapLocation[] {
  if (!Array.isArray(value) || value.length !== siteConfig.map.locations.length) {
    throw new Error("Supabase site_config.setting.map.locations must contain both people.");
  }

  return siteConfig.map.locations.map((person) => {
    if (person.gender !== "male" && person.gender !== "female") {
      throw new Error(`Invalid gender for map location "${person.id}" in site-config.json.`);
    }
    const savedLocation = value.find(
      (location): location is Record<string, unknown> =>
        typeof location === "object" &&
        location !== null &&
        "id" in location &&
        location.id === person.id
    );
    if (
      !savedLocation ||
      typeof savedLocation.city !== "string" ||
      savedLocation.city.trim().length === 0 ||
      !Array.isArray(savedLocation.coords) ||
      savedLocation.coords.length !== 2 ||
      typeof savedLocation.coords[0] !== "number" ||
      typeof savedLocation.coords[1] !== "number" ||
      !Number.isFinite(savedLocation.coords[0]) ||
      !Number.isFinite(savedLocation.coords[1]) ||
      savedLocation.coords[0] < -90 ||
      savedLocation.coords[0] > 90 ||
      savedLocation.coords[1] < -180 ||
      savedLocation.coords[1] > 180
    ) {
      throw new Error(`Invalid Supabase map coordinates for "${person.id}".`);
    }

    return {
      id: person.id,
      name: person.name,
      gender: person.gender,
      city: savedLocation.city,
      coords: [savedLocation.coords[0], savedLocation.coords[1]],
    };
  });
}

export function parseSiteNotifications(value: unknown): SiteNotification[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("Supabase site_config.setting.notifications must be an array of up to 100 items.");
  }

  return value.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      !("title" in item) ||
      !("message" in item) ||
      !("createdAt" in item) ||
      typeof item.id !== "string" ||
      item.id.length === 0 ||
      item.id.length > 100 ||
      typeof item.title !== "string" ||
      item.title.trim().length === 0 ||
      item.title.length > 120 ||
      typeof item.message !== "string" ||
      item.message.trim().length === 0 ||
      item.message.length > 1000 ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(Date.parse(item.createdAt))
    ) {
      throw new Error("Invalid notification in Supabase site settings.");
    }

    return {
      id: item.id,
      title: item.title.normalize("NFC"),
      message: item.message.normalize("NFC"),
      createdAt: new Date(item.createdAt).toISOString(),
    };
  });
}

export async function getSiteSettings() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }

  const { setting } = await getSiteSettingsRow(config);
  if (typeof setting.maintenance !== "boolean") {
    throw new Error("Supabase site_config.setting.maintenance must be a boolean.");
  }
  const maintenanceEndsAt = setting.maintenanceEndsAt;
  if (
    maintenanceEndsAt !== undefined &&
    maintenanceEndsAt !== null &&
    (typeof maintenanceEndsAt !== "string" ||
      !Number.isFinite(Date.parse(maintenanceEndsAt)))
  ) {
    throw new Error("Supabase site_config.setting.maintenanceEndsAt must be a valid date or null.");
  }

  const mapSetting =
    typeof setting.map === "object" && setting.map !== null
      ? setting.map as Record<string, unknown>
      : null;
  const notifications = parseSiteNotifications(setting.notifications);
  return {
    maintenance: setting.maintenance,
    maintenanceEndsAt: typeof maintenanceEndsAt === "string" ? maintenanceEndsAt : null,
    locations: parseMapLocations(mapSetting?.locations),
    notifications,
  };
}

export async function getPublicNotifications() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }
  const { setting } = await getSiteSettingsRow(config);
  return parseSiteNotifications(setting.notifications);
}

export async function updateSiteSettings(updates: SiteSettingsUpdates) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }
  if (
    (updates.maintenance === undefined &&
      updates.maintenanceEndsAt === undefined &&
      updates.locations === undefined &&
      updates.notifications === undefined) ||
    (updates.maintenance !== undefined && typeof updates.maintenance !== "boolean")
  ) {
    throw new Error("Provide a valid maintenance value or map locations to update.");
  }
  if (
    updates.maintenanceEndsAt !== undefined &&
    updates.maintenanceEndsAt !== null &&
    (!Number.isFinite(Date.parse(updates.maintenanceEndsAt)) ||
      Date.parse(updates.maintenanceEndsAt) <= Date.now())
  ) {
    throw new Error("The maintenance end time must be in the future.");
  }
  if (updates.notifications !== undefined) {
    parseSiteNotifications(updates.notifications);
  }

  const currentRow = await getSiteSettingsRow(config);
  const setting = { ...currentRow.setting };

  if (updates.maintenance !== undefined) {
    setting.maintenance = updates.maintenance;
  }
  if (updates.maintenanceEndsAt !== undefined) {
    setting.maintenanceEndsAt = updates.maintenanceEndsAt;
  }
  if (updates.locations) {
    const locations = parseMapLocations(updates.locations);
    const mapSetting =
      typeof setting.map === "object" && setting.map !== null
        ? setting.map as Record<string, unknown>
        : {};
    setting.map = {
      ...mapSetting,
      locations: locations.map(({ id, city, coords }) => ({ id, city, coords })),
    };
  }
  if (updates.notifications) {
    setting.notifications = parseSiteNotifications(updates.notifications);
  }

  const response = await fetch(`${config.url}?id=eq.1`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(config.serviceKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ setting }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not update site settings in Supabase (HTTP ${response.status}).`);
  }

  const rows = (await response.json()) as SiteSettingsRow[];
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("No site_config row was updated.");
  }
  if (
    updates.maintenance !== undefined &&
    rows[0].setting.maintenance !== updates.maintenance
  ) {
    throw new Error("The updated maintenance value did not match the requested value.");
  }
  const savedMaintenanceEndsAt = rows[0].setting.maintenanceEndsAt;
  if (
    savedMaintenanceEndsAt !== undefined &&
    savedMaintenanceEndsAt !== null &&
    (typeof savedMaintenanceEndsAt !== "string" ||
      !Number.isFinite(Date.parse(savedMaintenanceEndsAt)))
  ) {
    throw new Error("Supabase did not return a valid maintenance end time.");
  }
  const maintenanceSettings = {
    maintenance: rows[0].setting.maintenance,
    maintenanceEndsAt:
      typeof savedMaintenanceEndsAt === "string" ? savedMaintenanceEndsAt : null,
  };
  const notificationSettings =
    updates.notifications !== undefined
      ? { notifications: parseSiteNotifications(rows[0].setting.notifications) }
      : {};
  if (updates.locations) {
    const updatedMap = rows[0].setting.map;
    const locations = parseMapLocations(
      typeof updatedMap === "object" && updatedMap !== null
        ? (updatedMap as Record<string, unknown>).locations
        : undefined
    );
    return { ...maintenanceSettings, ...notificationSettings, locations };
  }
  return { ...maintenanceSettings, ...notificationSettings };
}
