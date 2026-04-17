"use client";

import { useEffect, useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSong } from "../../actions";
import { useApi } from "@/lib/api-client";
import { Song } from "@/types/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";

interface EditLyricsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditLyricsPage({ params }: EditLyricsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchApi } = useApi();

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [lyrics, setLyrics] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadSong() {
      try {
        const song = await fetchApi<Song>(`/songs/${id}`);
        if (isMounted) {
          setLyrics(song.lyrics || "");
        }
      } catch {
        toast.error("Failed to load song lyrics");
        router.push("/dashboard/songs");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSong();
    return () => {
      isMounted = false;
    };
    // fetchApi agora é estável, id não muda.
  }, [id, fetchApi, router]);

  const handleSave = async () => {
    startTransition(async () => {
      const result = await updateSong(id, { lyrics });

      if (result.success) {
        toast.success("Lyrics updated successfully!");
        router.back();
      } else {
        toast.error(result.error || "Failed to update lyrics");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Lyrics</h1>
            <p className="text-muted-foreground text-sm">
              Modify the lyrics for this song.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="w-full flex-1">
        <textarea
          className="bg-background focus:ring-primary/20 h-full w-full resize-none rounded-lg border p-6 font-mono text-lg shadow-sm focus:ring-2 focus:outline-none"
          placeholder="Start typing or paste the lyrics here..."
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          disabled={isPending}
          autoFocus
        />
      </div>
    </div>
  );
}
