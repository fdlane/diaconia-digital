import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import type { LocalPhoto } from "./types";

export async function pickImage(type: LocalPhoto["type"]): Promise<LocalPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return {
    id: Crypto.randomUUID(),
    uri: result.assets[0].uri,
    type,
    contentType: result.assets[0].mimeType ?? "image/jpeg",
    byteSize: result.assets[0].fileSize ?? 1,
    uploaded: false,
  };
}
