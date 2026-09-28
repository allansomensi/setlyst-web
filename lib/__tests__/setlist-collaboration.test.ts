import { describe, expect, it } from "vitest";
import { describeNotification } from "@/lib/notification-messages";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ptBR from "@/messages/pt-BR.json";
import { COLLABORATOR_ROLES } from "@/types/api";

describe("setlist collaboration", () => {
  it("describes an invite with the translated role", () => {
    expect(
      describeNotification({
        type: "setlist_invitation",
        data: {
          setlist_id: "s1",
          setlist_title: "Show do Beto",
          role: "editor",
          actor_id: "u1",
          invited_by: "beto",
        },
      }),
    ).toMatchObject({
      key: "setlistInvitation",
      values: {
        user: "beto",
        title: "Show do Beto",
        role: { ref: "collaboratorRole", value: "editor" },
      },
      href: "/dashboard/setlists",
      icon: "setlistInvite",
    });
  });

  it("names every role and hint in every language", () => {
    for (const messages of [en, es, ptBR]) {
      const collaborators = messages.setlists.collaborators;
      for (const role of COLLABORATOR_ROLES) {
        expect(collaborators.roles[role]).toBeTruthy();
        expect(collaborators.roleHints[role]).toBeTruthy();
      }
      expect(messages.notifications.setlistInvitation).toContain("{role}");
      // Songs a setlist keeps after their contributor is gone.
      expect(messages.setlists.songs.held).toBeTruthy();
      expect(messages.setlists.songs.copyToLibraryFor).toContain("{title}");
      expect(messages.apiErrors.SONG_ALREADY_IN_LIBRARY).toBeTruthy();
    }
  });
});
