export default function diff(oldVNode, newVNode) {
  if (!oldVNode) return { type: "CREATE", newVNode };
  if (!newVNode) return { type: "REMOVE" };
  if (typeof oldVNode !== typeof newVNode || oldVNode.tag !== newVNode.tag) {
    return { type: "REPLACE", newVNode };
  }

  if (oldVNode.text !== newVNode.text || oldVNode.html !== newVNode.html) {
    return { type: "TEXT", newVNode };
  }

  let propPatches = [];
  let oldProps = oldVNode.attrs || {};
  let newProps = newVNode.attrs || {};
  for (let key in { ...oldProps, ...newProps }) {
    if (oldProps[key] !== newProps[key]) {
      propPatches.push({ key, value: newProps[key] });
    }
  }

  const maxChildren = Math.max(
    oldVNode.children ? oldVNode.children.length : 0,
    newVNode.children ? newVNode.children.length : 0,
  );

  const childPatches = [];
  for (let i = 0; i < maxChildren; i++) {
    childPatches.push(diff(oldVNode.children?.[i], newVNode.children?.[i]));
  }

  return { type: "UPDATE", propPatches, childPatches };
}