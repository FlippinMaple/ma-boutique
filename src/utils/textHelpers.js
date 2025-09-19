//Fonction pour lees majuscules dans les noms
export function capitalizeSmart(str) {
  if (!str) return '';

  const lowercaseWords = [
    'de',
    'du',
    'des',
    'le',
    'la',
    'les',
    'van',
    'von',
    'di',
    'da',
    "d'",
    "l'"
  ];

  return str
    .toLowerCase()
    .split(/[\s-]+/) // split sur espace ou tiret
    .map((part, index) => {
      if (lowercaseWords.includes(part) && index !== 0) {
        return part;
      }

      // Gestion des noms comme O'Connor ou D'Artagnan
      if (part.includes("'")) {
        const [prefix, suffix] = part.split("'");
        return prefix.toLowerCase() + "'" + capitalizeSmart(suffix);
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

//Fonction pour trimmer et mettre en minuscule les courriels
export function formatEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

// ✅ Formate un numéro au style nord-américain
export function formatPhone(phone) {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  // Format nord-américain avec ou sans indicatif '1'
  const match = cleaned.match(/^1?(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }

  // Si pas un numéro standard : retourne brut nettoyé
  return cleaned;
}

// ✅ Valide que le numéro est canadien (ou américain)
export function isValidCanadianPhone(phone) {
  if (!phone) return false;

  const cleaned = phone.replace(/\D/g, '');

  // Accepte : 10 chiffres ou 11 chiffres commençant par "1"
  return /^1?\d{10}$/.test(cleaned);
}
