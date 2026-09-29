"use client";

import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Crown,
  Loader2,
  LogOut,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import {
  COLLABORATOR_ROLES,
  type CollaboratorCandidate,
  type CollaboratorRole,
  type SetlistCollaborators as Collaborators,
} from "@/types/api";
import {
  inviteSetlistCollaborator,
  lookupSetlistCollaborator,
  removeSetlistCollaborator,
  updateSetlistCollaborator,
} from "@/app/[locale]/dashboard/setlists/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { useAppRouter } from "@/hooks/use-app-router";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";

interface SetlistCollaboratorsProps {
  setlistId: string;
  collaborators: Collaborators;
  /**
   * The caller's role when the setlist is shared with them; `undefined`
   * for its owner.
   */
  myRole?: CollaboratorRole;
  className?: string;
}

/** Who may manage collaborators holding `role` (same rule as the API). */
function canManageRole(
  myRole: CollaboratorRole | undefined,
  role: CollaboratorRole,
): boolean {
  if (!myRole) return true;
  return myRole === "manager" && role !== "manager";
}

/**
 * Who a personal setlist is shared with: a row of avatars that opens the
 * list, where the owner (and managers) invite people by username, change
 * their roles and remove them, and a collaborator can leave.
 */
export function SetlistCollaborators({
  setlistId,
  collaborators,
  myRole,
  className,
}: SetlistCollaboratorsProps) {
  const t = useTranslations("setlists.collaborators");
  const [open, setOpen] = useState(false);
  const { owner } = collaborators;
  const accepted = collaborators.collaborators.filter((c) => c.accepted);
  const people = [owner, ...accepted];
  const canInvite = !myRole || myRole === "manager";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-visible:ring-ring hover:bg-muted/60 flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        // The visible text ("Shared with 3 people") is the name, so speech
        // input can target what is on screen; an aria-label replaced it.
        // What the button does goes in the description instead.
        title={t("openList")}
        aria-haspopup="dialog"
      >
        {/* Decorative here: the names are in the list it opens, and read
            out one by one they'd bury the count. */}
        <span className="flex -space-x-2" aria-hidden>
          {people.slice(0, 5).map((person) => (
            <UserAvatar
              key={person.user_id}
              userId={person.user_id}
              name={person.username}
              avatarUrl={person.avatar_url}
              size="xs"
              className="ring-background ring-2"
            />
          ))}
        </span>
        <span className="text-muted-foreground">
          {accepted.length === 0
            ? t("onlyYou")
            : t("sharedWith", { count: accepted.length })}
        </span>
      </button>
      {canInvite && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {t("invite")}
        </Button>
      )}

      <CollaboratorsDialog
        open={open}
        onOpenChange={setOpen}
        setlistId={setlistId}
        collaborators={collaborators}
        myRole={myRole}
      />
    </div>
  );
}

function CollaboratorsDialog({
  open,
  onOpenChange,
  setlistId,
  collaborators,
  myRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setlistId: string;
  collaborators: Collaborators;
  myRole?: CollaboratorRole;
}) {
  const t = useTranslations("setlists.collaborators");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const myId = useSession().data?.user?.id;
  const offlineDisabled = useOfflineDisabled();
  const offline = !!offlineDisabled.disabled;
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [toRemove, setToRemove] = useState<{
    userId: string;
    username: string;
    self: boolean;
  } | null>(null);

  const canInvite = !myRole || myRole === "manager";
  const invitableRoles = COLLABORATOR_ROLES.filter((r) =>
    canManageRole(myRole, r),
  );

  const name = username.trim().replace(/^@/, "");
  const lookup = useUsernameLookup(
    setlistId,
    canInvite && !offline ? name : "",
  );
  const canSend =
    lookup.state === "found" && lookup.candidate.status === "available";

  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || isPending || !canSend) return;
    startTransition(async () => {
      const result = await inviteSetlistCollaborator(setlistId, name, role);
      if (!result.success) {
        // The API's message for this code speaks of bands.
        toastActionError(
          result,
          result.apiCode === "ALREADY_MEMBER"
            ? t("alreadyInvited", { username: name })
            : result.error,
        );
        return;
      }
      toast.success(t("invited", { username: name }));
      setUsername("");
    });
  };

  const changeRole = (userId: string, next: CollaboratorRole) => {
    startTransition(async () => {
      const result = await updateSetlistCollaborator(setlistId, userId, next);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("roleChanged"));
    });
  };

  const confirmRemove = () => {
    if (!toRemove) return;
    const { userId, self } = toRemove;
    startTransition(async () => {
      const result = await removeSetlistCollaborator(setlistId, userId);
      setToRemove(null);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      if (self) {
        toast.success(t("left"));
        onOpenChange(false);
        router.push("/dashboard/setlists");
      } else {
        toast.success(t("removed"));
      }
    });
  };

  const { owner } = collaborators;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="text-primary h-5 w-5" aria-hidden />
              {t("title")}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {canInvite && (
            <form onSubmit={invite} className="space-y-2">
              <Label htmlFor="collaborator-username">{t("inviteLabel")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="collaborator-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("usernamePlaceholder")}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={51}
                  disabled={isPending || offline}
                  aria-describedby="collaborator-lookup"
                  aria-invalid={lookup.state === "notFound" || undefined}
                  className="sm:flex-1"
                />
                <NativeSelect
                  aria-label={t("roleLabel")}
                  value={role}
                  onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                  disabled={isPending || offline}
                  wrapperClassName="sm:w-36"
                >
                  {invitableRoles.map((r) => (
                    <option key={r} value={r}>
                      {t(`roles.${r}`)}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  type="submit"
                  className="gap-1.5"
                  disabled={isPending || offline || !canSend}
                  title={offlineDisabled.title}
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  {t("send")}
                </Button>
              </div>
              <LookupResult id="collaborator-lookup" lookup={lookup} />
              <p className="text-muted-foreground text-xs">
                {t(`roleHints.${role}`)}
              </p>
            </form>
          )}

          <ul className="divide-y rounded-lg border">
            <li className="flex items-center gap-3 p-3">
              <UserAvatar
                userId={owner.user_id}
                name={owner.username}
                avatarUrl={owner.avatar_url}
                size="sm"
              />
              <PersonName
                username={owner.username}
                firstName={owner.first_name}
                lastName={owner.last_name}
                isMe={owner.user_id === myId}
              />
              <Badge variant="secondary" className="ml-auto gap-1">
                <Crown className="h-3 w-3" aria-hidden />
                {t("owner")}
              </Badge>
            </li>
            {collaborators.collaborators.map((person) => {
              const isMe = person.user_id === myId;
              const manageable = !isMe && canManageRole(myRole, person.role);
              return (
                <li
                  key={person.user_id}
                  className="flex flex-wrap items-center gap-3 p-3"
                >
                  <UserAvatar
                    userId={person.user_id}
                    name={person.username}
                    avatarUrl={person.avatar_url}
                    size="sm"
                    className={cn(!person.accepted && "opacity-60")}
                  />
                  <PersonName
                    username={person.username}
                    firstName={person.first_name}
                    lastName={person.last_name}
                    isMe={isMe}
                    pending={!person.accepted}
                  />
                  <div className="ml-auto flex items-center gap-1">
                    {manageable ? (
                      <NativeSelect
                        aria-label={t("roleFor", {
                          username: person.username,
                        })}
                        value={person.role}
                        onChange={(e) =>
                          changeRole(
                            person.user_id,
                            e.target.value as CollaboratorRole,
                          )
                        }
                        disabled={isPending || offline}
                        wrapperClassName="w-32"
                      >
                        {COLLABORATOR_ROLES.filter((r) =>
                          canManageRole(myRole, r),
                        ).map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <Badge variant="outline">
                        {t(`roles.${person.role}`)}
                      </Badge>
                    )}
                    {(manageable || isMe) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setToRemove({
                            userId: person.user_id,
                            username: person.username,
                            self: isMe,
                          })
                        }
                        disabled={isPending || offline}
                        aria-label={
                          isMe
                            ? t("leave")
                            : person.accepted
                              ? t("removeFor", { username: person.username })
                              : t("cancelInviteFor", {
                                  username: person.username,
                                })
                        }
                        title={
                          isMe
                            ? t("leave")
                            : person.accepted
                              ? t("remove")
                              : t("cancelInvite")
                        }
                      >
                        {isMe ? (
                          <LogOut className="h-4 w-4" aria-hidden />
                        ) : (
                          <X className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {collaborators.collaborators.length === 0 && (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!toRemove}
        onOpenChange={(value) => !value && setToRemove(null)}
        title={toRemove?.self ? t("leaveTitle") : t("removeTitle")}
        description={
          toRemove?.self
            ? t("leaveConfirm")
            : t("removeConfirm", { username: toRemove?.username ?? "" })
        }
        confirmLabel={toRemove?.self ? t("leave") : tCommon("remove")}
        onConfirm={confirmRemove}
        pending={isPending}
      />
    </>
  );
}

type Lookup =
  | { state: "idle" }
  | { state: "checking"; username: string }
  | { state: "found"; candidate: CollaboratorCandidate }
  | { state: "notFound"; username: string }
  | { state: "failed" };

/** Wait after the last keystroke before looking the username up. */
const LOOKUP_DELAY_MS = 350;

/**
 * Looks `username` up as it's typed (debounced), so the form can confirm
 * the account exists before the invite is sent. An empty name is `idle`.
 */
function useUsernameLookup(setlistId: string, username: string): Lookup {
  const [result, setResult] = useState<{
    username: string;
    lookup: Lookup;
  } | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const response = await lookupSetlistCollaborator(setlistId, username);
      if (cancelled) return;
      const lookup: Lookup =
        response.success && response.data
          ? { state: "found", candidate: response.data }
          : !response.success && response.apiCode === "USER_NOT_FOUND"
            ? { state: "notFound", username }
            : { state: "failed" };
      setResult({ username, lookup });
    }, LOOKUP_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [setlistId, username]);

  if (!username) return { state: "idle" };
  // Only the answer for what's in the field now counts.
  if (result?.username !== username) return { state: "checking", username };
  return result.lookup;
}

/** The lookup's answer, right under the username field. */
function LookupResult({ id, lookup }: { id: string; lookup: Lookup }) {
  const t = useTranslations("setlists.collaborators.lookup");

  let content: ReactNode = null;
  if (lookup.state === "checking") {
    content = (
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {t("checking", { username: lookup.username })}
      </p>
    );
  } else if (lookup.state === "notFound") {
    content = (
      <p className="text-destructive flex items-center gap-2 text-xs">
        <CircleX className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("notFound", { username: lookup.username })}
      </p>
    );
  } else if (lookup.state === "failed") {
    content = (
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("failed")}
      </p>
    );
  } else if (lookup.state === "found") {
    const { candidate } = lookup;
    const available = candidate.status === "available";
    content = (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2",
          available
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5",
        )}
      >
        <UserAvatar
          userId={candidate.user_id}
          name={candidate.username}
          avatarUrl={candidate.avatar_url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">@{candidate.username}</p>
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              available
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400",
            )}
          >
            {available ? (
              <CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span className="sr-only">{t("found")}: </span>
            {t(`status.${candidate.status}`)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id={id} role="status" aria-live="polite" className="empty:hidden">
      {content}
    </div>
  );
}

function PersonName({
  username,
  firstName,
  lastName,
  isMe,
  pending = false,
}: {
  username: string;
  firstName: string | null;
  lastName: string | null;
  isMe: boolean;
  pending?: boolean;
}) {
  const t = useTranslations("setlists.collaborators");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">
        {fullName || `@${username}`}
        {isMe && (
          <span className="text-muted-foreground font-normal">
            {" "}
            ({t("you")})
          </span>
        )}
      </p>
      <p className="text-muted-foreground truncate text-xs">
        {fullName ? `@${username}` : null}
        {fullName && pending ? " · " : null}
        {pending ? t("pending") : null}
      </p>
    </div>
  );
}
