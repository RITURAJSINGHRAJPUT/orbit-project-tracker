export const PROFILE = {
  name: 'Utsav',
  org: 'Bookends Hospitality',
} as const;

/** Initials shown in the header avatar when there's no photo. */
export const profileInitials = (name: string = PROFILE.name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
