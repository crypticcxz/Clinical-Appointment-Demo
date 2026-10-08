import { handleRequest } from "../../server/api.mjs";

export default async function (request) {
  return handleRequest(request);
}
