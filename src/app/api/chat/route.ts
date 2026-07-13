/**
 * /api/chat — alias for /api/assistant
 *
 * @assistant-ui/react-ai-sdk's useChatRuntime defaults to /api/chat.
 * This route re-exports the same handler so both paths work.
 */
export { POST, maxDuration } from "@/app/api/assistant/route";
