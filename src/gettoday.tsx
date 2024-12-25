import { Action, ActionPanel, Color, Detail, Form, List, ToastStyle, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import fetch from "node-fetch";

function WikipediaOnThisDayListItem({ story }: { story: WikipediaOnThisDay }) {
  const detailMarkdown = story.pages
    .map(
      (page) =>
        `### [${page.title}](${page.pageUrl})\n\n${page.extract}\n\n![Image](${page.imageUrl})\n`
    )
    .join("\n---\n");

  return (
    <List.Item
      key={story.title}
      title={story.title}
      accessories={[
        { tag: story.year.toString() },
        { tag: { value: `Pages: ${story.pages.length.toString()}`, color: Color.Blue } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<Detail markdown={detailMarkdown} />} />
        </ActionPanel>
      }
    />
  );
}

interface WikipediaOnThisDay {
  year: number;
  pages: WikipediaPage[];
  title: string;
}

interface WikipediaPage {
  title: string;
  extract: string;
  pageUrl: string;
  imageUrl: string;
}

// JSON response from the Wikipedia API
interface WikipediaPageJson {
  normalizedtitle: string;
  extract: string;
  content_urls: {
    desktop: {
      page: string;
    };
  };
  thumbnail: {
    source: string;
  };
}

interface ApiResponse {
  onthisday: {
    text: string;
    pages: WikipediaPageJson[];
    year: number;
  }[];
}

export default function Command() {
  const [wikipediaStories, setWikipediaStories] = useState<WikipediaOnThisDay[]>([]);
  const [error, setError] = useState<Error>();
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    async function getWikipediaStories() {
      try {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const response = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`);
        const data = (await response.json()) as ApiResponse;
        const onThisDay = data.onthisday;
        console.log(data);
        
        const wikipediaPages: WikipediaOnThisDay[] = onThisDay.map((item) => {
          const subpages = item.pages.map((subItem) => ({
            title: subItem.normalizedtitle,
            extract: subItem.extract,
            pageUrl: subItem.content_urls.desktop.page,
            imageUrl: subItem.thumbnail?.source || "",
          }));

          return {
            year: item.year,
            title: item.text,
            pages: subpages,
          };
        });
        
        console.log(wikipediaPages);
        setWikipediaStories(wikipediaPages);
      } catch (error) {
        setError(new Error("Error loading Wikipedia stories" + error));
        console.error("Error loading Wikipedia stories", error);
      }
    }
    getWikipediaStories();
    
    if (error) {
      showToast(ToastStyle.Failure, "Failed to load Wikipedia stories", error.message);
    }
  }, [error]);

  return (
    <List
      isLoading={wikipediaStories.length === 0}
      navigationTitle="Wikipedia On This Day"
      searchBarPlaceholder="Filter stories by title..."
      searchBarAccessory={
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
            </ActionPanel>
          }
        >
          <Form.DatePicker id="launchDate" title="Launch Date" value={date} onChange={(newValue) => setDate(newValue || new Date())} />
        </Form>
      }
    >
      {wikipediaStories.map((story) => (
        <WikipediaOnThisDayListItem key={story.title} story={story} />
      ))}
    </List>
  );
}
