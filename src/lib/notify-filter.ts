/** Welche Hinweise sieht eine Person: gezielt an sie, oder an alle (außer an den, der es ausgelöst hat) */
export const visibleTo = (email: string) => {
  const me = email.toLowerCase();
  return `target_email.eq.${me},and(target_email.is.null,or(exclude_email.is.null,exclude_email.neq.${me}))`;
};
