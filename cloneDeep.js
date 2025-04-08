export function cloneDeep(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneDeep);
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }
  const clonedObj = {};
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      clonedObj[key] = cloneDeep(value[key]);
    }
  }
  return clonedObj;
}