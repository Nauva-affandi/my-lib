export function spinner({ size = "md", w = "8" } = {}) {
	return `
		<div>
			<style>
				@import url("https://cdn.jsdelivr.net/combine/npm/daisyui@5/base/scrollbar.css,npm/daisyui@5/base/svg.css,npm/daisyui@5/base/reset.css,npm/daisyui@5/base/rootscrollgutter.css,npm/daisyui@5/base/rootcolor.css,npm/daisyui@5/base/properties.css,npm/daisyui@5/base/rootscrolllock.css,npm/daisyui@5/components/loading.css");
			</style>
			<span class="loading loading-spinner loading-${size} w-${w}"></span>
		</div>
	`
}