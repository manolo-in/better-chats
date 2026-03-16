import {
	publicProcedure,
	systemProcedure,
	userProcedure,
} from "./procedure.ts";

export const testRouter = {
	browser: publicProcedure.route({ method: "GET" }).handler(() => {
		return "Only browser can see this";
	}),
	system: systemProcedure.route({ method: "GET" }).handler(() => {
		return "Only system can see this";
	}),
	user: userProcedure.route({ method: "GET" }).handler(() => {
		return "Only user can see this";
	}),
};
