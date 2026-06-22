import { ReaderChoicePrompt } from "./ReaderChoicePrompt";
import type { ComponentProps } from "react";

export function PredictionCard(props: Omit<ComponentProps<typeof ReaderChoicePrompt>, "choiceType">) {
  return <ReaderChoicePrompt {...props} choiceType="prediction" />;
}
