import type { CreateMeetingInput } from "@diaconia/shared";

type SyncMeetingArgs = {
  apiUrl: string;
  token: string;
  payload: CreateMeetingInput;
};

export type UploadPhotoArgs = {
  apiUrl: string;
  token: string;
  photo: {
    uri: string;
    type: "user_profile_photo" | "group_profile_photo" | "meeting_photo";
    contentType: string;
    byteSize: number;
  };
  groupId?: string;
  ownerUserId?: string;
  meetingId?: string;
};

export type ZeroRuntimeConfig = {
  cacheUrl: string;
  queryUrl: string;
  mutateUrl: string;
};

export function getZeroRuntimeConfig(): ZeroRuntimeConfig {
  return {
    cacheUrl: process.env.EXPO_PUBLIC_ZERO_CACHE_URL ?? "http://localhost:4848",
    queryUrl: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/zero/query`,
    mutateUrl: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/zero/mutate`,
  };
}

export async function replayMeetingWrite({ apiUrl, token, payload }: SyncMeetingArgs) {
  const response = await fetch(`${apiUrl}/meetings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Meeting sync failed with ${response.status}`);
  }

  return response.json() as Promise<{ id: string; status: string }>;
}

export async function uploadPhotoAsset({
  apiUrl,
  token,
  photo,
  groupId,
  ownerUserId,
  meetingId,
}: UploadPhotoArgs) {
  const uploadResponse = await fetch(`${apiUrl}/media/uploads`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: photo.type,
      contentType: photo.contentType,
      byteSize: photo.byteSize,
      groupId,
      ownerUserId,
      meetingId,
    }),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload URL failed with ${uploadResponse.status}`);
  }

  const upload = (await uploadResponse.json()) as {
    mediaId: string;
    uploadUrl: string;
    headers: Record<string, string>;
  };

  const file = await fetch(photo.uri);
  const blob = await file.blob();
  const putResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.headers,
    body: blob,
  });

  if (!putResponse.ok) {
    throw new Error(`Image upload failed with ${putResponse.status}`);
  }

  return upload.mediaId;
}
