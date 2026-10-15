import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

//cn mixes the component’s default classes with extras you pass in
//if two Tailwind rules fight, the extra one is the one that stays
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
