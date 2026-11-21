import { Linking } from "react-native";

const digits = (p: string) => p.replace(/[^\d+]/g, "");
/** deutsche Nummern für WhatsApp ins internationale Format */
const intl = (p: string) => {
  let d = digits(p);
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `49${d.slice(1)}`;
  return d;
};

export const call = (phone: string) => Linking.openURL(`tel:${digits(phone)}`);
export const mail = (email: string, subject?: string) => Linking.openURL(`mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`);
export const whatsapp = (phone: string, text?: string) => Linking.openURL(`https://wa.me/${intl(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`);
export const openUrl = (url: string) => Linking.openURL(url);
