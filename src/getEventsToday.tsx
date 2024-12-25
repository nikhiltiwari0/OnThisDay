import { Action, ActionPanel, Color, Detail, Icon, List, ToastStyle, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import fetch from "node-fetch";

function detailViewOfOnThisDay(onThisDay: WikipediaOnThisDay, date: Date) {
  const dateMarkdown = "## " + dateGetMonthAndDay(date) + ", " + onThisDay.year.toString();
  const eventDetails = "### " + onThisDay.title;
  const relatedArticlesMarkdown = "### " + `Related Articles (${onThisDay.pages.length.toString()})`;
  const pageDataMarkdown = onThisDay.pages
    .map((page) => `### [${page.title}](${page.pageUrl})\n\n${page.extract}\n\n![Image](${page.imageUrl})\n`)
    .join("\n---\n");
    
  return (
    <Detail markdown={dateMarkdown + "\n" + eventDetails + "\n" + relatedArticlesMarkdown + "\n" + pageDataMarkdown} />
  );
}

function dateGetMonthAndDay(date: Date) {
  const monthString = date.toLocaleString("default", { month: "long" });
  const day = date.getDate();
  return `${monthString} ${day}`;
}

function WikipediaOnThisDayListItem({ story, date }: { story: WikipediaOnThisDay; date: Date }) {
  return (
    <List.Item
      key={story.title}
      // title={story.title.substring(0, 80) + (story.title.length > 80 ? "..." : "")}
      title={story.title}
      accessories={[
        { tag: story.year.toString() },
        { tag: { value: story.pages.length.toString(), color: Color.Blue }, icon: Icon.Document },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={detailViewOfOnThisDay(story, date)} />
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
        console.log("-----------------------" + onThisDay);
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
  }, []);

  return (
    <List
      isLoading={wikipediaStories.length === 0}
      navigationTitle="Wikipedia On This Day"
      searchBarPlaceholder="Filter stories by title..."
    >
      <List.Section title={dateGetMonthAndDay(date)}>
        {wikipediaStories.map((story) => (
          <WikipediaOnThisDayListItem key={story.title} story={story} date={date} />
        ))}
      </List.Section>
    </List>
  );
}
