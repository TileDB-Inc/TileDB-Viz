function capitalize(str: string): string {
  const firstChar = str.charAt(0);

  return firstChar.toUpperCase() + str.slice(1);
}

export default capitalize;
