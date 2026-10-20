import type { ReactElement } from "react";
import { withUnistyles } from "react-native-unistyles";
import { createLucideIcon, SquareDot, SquareMinus, SquarePlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { DiffFileChangeKind } from "@/git/file-header-presentation";
import type { Theme } from "@/styles/theme";

// Lucide has no square alert glyph; this pairs its square frame with the circle-alert mark.
const SquareAlert = createLucideIcon({
  name: "square-alert",
  size: 24,
  node: [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "frame" }],
    ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "stem" }],
    ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "dot" }],
  ],
});

const ThemedSquarePlus = withUnistyles(SquarePlus);
const ThemedSquareMinus = withUnistyles(SquareMinus);
const ThemedSquareDot = withUnistyles(SquareDot);
const ThemedSquareAlert = withUnistyles(SquareAlert);

const successMapping = (theme: Theme) => ({ color: theme.colors.statusSuccess });
const dangerMapping = (theme: Theme) => ({ color: theme.colors.statusDanger });
const warningMapping = (theme: Theme) => ({ color: theme.colors.statusWarning });

const ICON_SIZE = 14;

/**
 * The file's change kind, shown beside its diff stat.
 *
 * The square variants form one aligned visual family for added, deleted, modified, and
 * conflicted files.
 */
export function FileChangeIcon({ change }: { change: DiffFileChangeKind }): ReactElement {
  const { t } = useTranslation();

  if (change === "conflicted") {
    return (
      <ThemedSquareAlert
        size={ICON_SIZE}
        uniProps={dangerMapping}
        accessibilityLabel={t("workspace.git.diff.conflictedFile")}
      />
    );
  }

  if (change === "added") {
    return (
      <ThemedSquarePlus
        size={ICON_SIZE}
        uniProps={successMapping}
        accessibilityLabel={t("workspace.git.diff.newFile")}
      />
    );
  }

  if (change === "deleted") {
    return (
      <ThemedSquareMinus
        size={ICON_SIZE}
        uniProps={dangerMapping}
        accessibilityLabel={t("workspace.git.diff.deletedFile")}
      />
    );
  }

  return (
    <ThemedSquareDot
      size={ICON_SIZE}
      uniProps={warningMapping}
      accessibilityLabel={t("workspace.git.diff.modifiedFile")}
    />
  );
}
