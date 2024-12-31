<template>
	<router-view :async-data="asyncData" />
</template>

<script lang="ts" setup>
// Register global plugins/components here
// Read document get more details http://doc.ssr-fc.com/docs/features$communication#props%20%E7%9B%B4%E5%87%BA%E6%95%B0%E6%8D%AE
import { useRouter } from "vue-router";
import { App } from "vue";
const props = defineProps<{
	ssrApp: App;
	asyncData: { value: any };
}>();
const router = useRouter();

router.options.scrollBehavior = (to, from, savedPosition) => {
	console.log("%c Line:17 🥚 to", "color:#fff;background:#ea7e5c", to);
	// always scroll to top
	return { top: 0 };
};
</script>

<style lang="less">
@import "@/common.less";
</style>
