# ref

`ref` adalah reactive state handler buat nyimpen data reaktif lengkap dengan fitur `watch`, `undo`, `reset`, `batch`, dll.

```js
import { ref } from "./ref.js";

// bikin reactive state
const state = ref({ count: 0, user: { name: "nauva" } });

// akses nilai
console.log(state.value.count); // 0

// ubah nilai
state.value.count = 1;

// set langsung
state.set({ count: 10, user: { name: "nova" } });

// undo & reset
state.undo();   // balikin ke sebelum perubahan terakhir
state.reset();  // balikin ke nilai awal waktu ref dibuat

// batch biar watch cuma ke-trigger sekali
state.batch(() => {
  state.value.count = 2;
  state.value.user.name = "xxx";
});

// watch global
state.watch((baru, lama) => {
  console.log("berubah", lama, "=>", baru);
});

// watch nested path
state.watch("user.name", (baru, lama) => {
  console.log("nama berubah", lama, "=>", baru);
});

// chain config
state.watch("count", (baru, lama) => {
  console.log("count:", lama, "->", baru);
})
.id("watcherId")
.throttle(300)
.delay(100)
.once(3)
.useEffect();

// matiin watch
state.unwatch();            // default: matiin "main"
state.unwatch("watcherId"); // matiin by ID

// aktifin ulang
state.runWatch();             // default ID
state.runWatch("watcherId");  // ID tertentu

// mode silent (gak trigger watch)
state.silent.value = { count: 99, user: { name: "xxx" } };
state.silent.set({ count: 123 });
