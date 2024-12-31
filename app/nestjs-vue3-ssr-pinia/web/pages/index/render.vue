<template>
	<div class="p-20">
		<Search />
		<form>
			<div>dwdw</div>
			<div>pppp</div>
		</form>
		<template v-if="indexData">
			<Slider :data="indexData[0].components" />
			<Rectangle :data="indexData[1].components" />
		</template>
		<template v-else>
			<img
				src="https://gw.alicdn.com/tfs/TB1v.zIE7T2gK0jSZPcXXcKkpXa-128-128.gif"
				class="loading"
			/>
		</template>
	</div>
</template>

<script lang="ts" setup>
import { useIndexStore } from "@/pinia-store";
import Slider from "@/components/slider/index.vue";
import Rectangle from "@/components/rectangle/index.vue";
import Search from "@/components/search/index.vue";
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
console.log("%c Line:276 🥃 route", "color:#fff;background:#4fff4B", route);
const indexStore = useIndexStore();
const indexData = indexStore.data;
</script>
