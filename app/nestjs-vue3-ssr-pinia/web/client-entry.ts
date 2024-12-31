import clientRender from "kdssr/client-entry";
import { setPinia, setApp } from "./client-store";

const { app, pinia, router, mount } = clientRender();
setPinia(pinia);
setApp(app);

mount();
