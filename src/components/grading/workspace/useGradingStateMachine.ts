import { useReducer } from "react";
import { GradingUiState } from "./types";

type Action =
  | { type: "LOAD" }
  | { type: "LOAD_SUCCESS" }
  | { type: "LOAD_ERROR" }
  | { type: "EDIT" }
  | { type: "SAVE" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR" }
  | { type: "GENERATE" }
  | { type: "GENERATE_SUCCESS" }
  | { type: "GENERATE_ERROR" }
  | { type: "RETRY" };

const transition = (state: GradingUiState, action: Action): GradingUiState => {
  switch (action.type) {
    case "LOAD":
      return "loading";
    case "LOAD_SUCCESS":
      return "clean";
    case "LOAD_ERROR":
      return "error";
    case "EDIT":
      return state === "clean" || state === "success" ? "dirty" : state;
    case "SAVE":
      return "saving";
    case "SAVE_SUCCESS":
      return "clean";
    case "SAVE_ERROR":
      return "error";
    case "GENERATE":
      return "generating";
    case "GENERATE_SUCCESS":
      return "success";
    case "GENERATE_ERROR":
      return "error";
    case "RETRY":
      return "loading";
    default:
      return state;
  }
};

export const useGradingStateMachine = (initial: GradingUiState = "idle") => {
  const [state, dispatch] = useReducer(transition, initial);

  return {
    state,
    dispatch,
    isLoading: state === "loading",
    isDirty: state === "dirty",
    isSaving: state === "saving",
    isGenerating: state === "generating",
    isError: state === "error",
  };
};
