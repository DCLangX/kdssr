// import { Store } from 'vuex'
import { RouteLocationNormalizedLoaded } from "vue-router";
import { ISSRContext } from "kdssr";

interface Params {
	// store: Store<any>
	router: RouteLocationNormalizedLoaded;
}

export default async ({ router }: Params, ctx?: ISSRContext) => {};
