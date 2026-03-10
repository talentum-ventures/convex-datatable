type StoredConvexUser = {
  userId: string;
  userName: string;
  userColor: string;
};

const STORAGE_KEY = "rolha-grid:convex-user";
const USER_COLORS = ["#1d4ed8", "#0f766e", "#b45309", "#7c3aed"] as const;

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function createUser(): StoredConvexUser {
  const userId = `demo-user-${crypto.randomUUID().slice(0, 8)}`;
  const colorIndex = hashString(userId) % USER_COLORS.length;

  return {
    userId,
    userName: `Demo ${userId.slice(-4).toUpperCase()}`,
    userColor: USER_COLORS[colorIndex] ?? USER_COLORS[0]
  };
}

export function getStoredConvexUser(): StoredConvexUser {
  if (typeof window === "undefined") {
    return {
      userId: "demo-user-server",
      userName: "Demo Server",
      userColor: USER_COLORS[0]
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredConvexUser>;
      if (
        typeof parsed.userId === "string" &&
        typeof parsed.userName === "string" &&
        typeof parsed.userColor === "string"
      ) {
        return {
          userId: parsed.userId,
          userName: parsed.userName,
          userColor: parsed.userColor
        };
      }
    }
  } catch {
    // ignore malformed local storage
  }

  const nextUser = createUser();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  } catch {
    // ignore storage failures
  }

  return nextUser;
}
