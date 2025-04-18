import { workspace, window } from "vscode";
import { COMMIT_TYPES } from "../lib/constants";
import { getApiResponse } from "../lib/utils";
import {
  getCommitTypeObject,
  commitTypesOpts,
  generateCommitMessage,
  releaseCommit,
} from "../lib/utils.git";
import { type Settings } from "../types";

export function aiCommits({ settings }: { settings: Settings }) {
  const config = workspace.getConfiguration("spilot"); // Updated from "colaBot"
  const withGitmoji = config.get<boolean>("gitMoji") ?? false;
  const withSemVer =
    config.get<boolean>("semanticVersioningSpecification") ?? false;
  const commitOptions = commitTypesOpts(withGitmoji, withSemVer);

  try {
    window
      .showQuickPick(commitOptions, {
        placeHolder: "Select a commit type",
        title: "Spilot: Semantic Commit", // Updated from "ColaBOT"
      })
      .then(async (commitType) => {
        if (!commitType) return;

        let aiCommitMessage: string | undefined = "";

        if (commitType.includes(COMMIT_TYPES.ai.description)) {
          const promptMessage = await generateCommitMessage(withSemVer);
          if (promptMessage) {
            try {
              aiCommitMessage = await getApiResponse(promptMessage, settings);
            } catch (err) {
              window.showErrorMessage(
                `Error generating AI commit message: ${String(err)}`
              );
              return;
            }
          }
        }

        window
          .showInputBox({
            value: aiCommitMessage,
            placeHolder: "Eg: Add new props to the button component",
            prompt: `${
              aiCommitMessage
                ? "Would you like to use this commit message?"
                : "Write your commit message"
            }`,
          })
          .then(async (commitMessage) => {
            if (!commitMessage) return;

            try {
              if (!withSemVer) {
                await releaseCommit(commitMessage, false);
                return;
              }

              if (aiCommitMessage) {
                // Removed unused variable 'type'
                const { commit, release } = getCommitTypeObject({
                  type: "ai",
                  isAI: !!aiCommitMessage,
                  withGitmoji,
                  commit: aiCommitMessage,
                });

                await releaseCommit(commit, release);
              } else {
                const type: "ai" | string = aiCommitMessage
                  ? "ai"
                  : withGitmoji
                  ? commitType.split(" ")[1].replace(":", "")
                  : commitType.split(":")[0];
                const { commit, release } = getCommitTypeObject({
                  type,
                  isAI: !!aiCommitMessage,
                  withGitmoji,
                  commit: commitMessage,
                });

                await releaseCommit(commit, release);
              }
            } catch (err) {
              window.showErrorMessage(
                `Error committing changes: ${String(err)}`
              );
            }
          });
      });
  } catch (err) {
    window.showErrorMessage(`Unexpected error: ${String(err)}`);
  }
}
