type SiteSettingsRow = {
  id: number;
  setting: Record<string, unknown>;
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

export async function getMaintenanceMode() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }

  const response = await fetch(
    `${config.url}?id=eq.1&select=id,setting`,
    {
      headers: getSupabaseHeaders(config.serviceKey),
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Could not load site settings from Supabase (HTTP ${response.status}).`);
  }

  const rows = (await response.json()) as SiteSettingsRow[];
  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    typeof rows[0].setting !== "object" ||
    rows[0].setting === null ||
    typeof rows[0].setting.maintenance !== "boolean"
  ) {
    throw new Error("Supabase site_config must contain id=1 and setting.maintenance as a boolean.");
  }
  return rows[0].setting.maintenance;
}

export async function updateMaintenanceMode(maintenance: boolean) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }

  const currentResponse = await fetch(`${config.url}?id=eq.1&select=id,setting`, {
    headers: getSupabaseHeaders(config.serviceKey),
    cache: "no-store",
  });
  if (!currentResponse.ok) {
    throw new Error(`Could not load site settings before update (HTTP ${currentResponse.status}).`);
  }
  const currentRows = (await currentResponse.json()) as SiteSettingsRow[];
  if (
    !Array.isArray(currentRows) ||
    currentRows.length !== 1 ||
    typeof currentRows[0].setting !== "object" ||
    currentRows[0].setting === null
  ) {
    throw new Error("Supabase site_config must contain one id=1 row with a JSON setting value.");
  }

  const response = await fetch(`${config.url}?id=eq.1`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(config.serviceKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      setting: { ...currentRows[0].setting, maintenance },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not update site settings in Supabase (HTTP ${response.status}).`);
  }

  const rows = (await response.json()) as SiteSettingsRow[];
  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    typeof rows[0].setting?.maintenance !== "boolean" ||
    rows[0].setting.maintenance !== maintenance
  ) {
    throw new Error("No site_config row was updated or its maintenance value did not match.");
  }
  return rows[0].setting.maintenance;
}
