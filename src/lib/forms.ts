export const numberValue = (formData: FormData, key: string, fallback = 1) => {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
};

export const stringValue = (formData: FormData, key: string, fallback = "") => String(formData.get(key) ?? fallback);

export const episodeIdentifier = (seasonNumber: number, episodeNumber: number) =>
  `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
