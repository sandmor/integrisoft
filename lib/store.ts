import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { api } from "./redux/api";

export const makeStore = () => {
  const store = configureStore({
    reducer: (state, action) => {
      if (action.type === "REPLACE_STATE") {
        return action.payload;
      }
      return {
        [api.reducerPath]: api.reducer(state?.[api.reducerPath], action),
      };
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });

  setupListeners(store.dispatch);

  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
