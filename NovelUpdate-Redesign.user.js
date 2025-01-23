// ==UserScript==
// @name        NovelUpdates-Plus
// @namespace   https://github.com/Salvora
// @version     1.0.4
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @match       https://www.novelupdates.com/*
// @resource    customCSS https://github.com/Salvora/NovelUpdates-Plus/raw/refs/heads/main/Resources/styles.css?v=1.0.0
// @author      Salvora
// @icon        https://github.com/Salvora/NovelUpdates-Plus/raw/refs/heads/main/Images/NU+_Icon.png#sha256=b5fd8289a4e7379fd7958cd5937ebeb93c12458b3e4ed7230a79aefc892aa6e7
// @homepageURL https://github.com/Salvora/NovelUpdates-Plus
// @updateURL   https://github.com/Salvora/NovelUpdates-Plus/raw/refs/heads/main/NovelUpdate-Redesign.user.js
// @downloadURL https://github.com/Salvora/NovelUpdates-Plus/raw/refs/heads/main/NovelUpdate-Redesign.user.js
// @supportURL  https://github.com/Salvora/NovelUpdates-Plus/issues
// @description Redesign Novelupdates to better manipulate
// ==/UserScript==

(function () {
  ("use strict");

  // Configuration variable to control the search bar
  let enableSearchBar = true;

  // Search URL template
  const searchUrlTemplate =
    "https://www.novelupdates.com/series-finder/?sf=1&sh=${query}&sort=abc&order=desc";

  let chapterIdentifier;
  let inputBox;
  let button;
  let navlinksfragment;
  let navlinks;
  let custom_chapter_number;

  GM_addStyle(GM_getResourceText("customCSS"));

  // Function to handle search when "Enter" is pressed
  function handleSearch(event) {
    if (event.key === "Enter") {
      const query = event.target.value.trim(); // Trim whitespace
      if (query) {
        const searchUrl = searchUrlTemplate.replace(
          "${query}",
          encodeURIComponent(query)
        );
        window.location.href = searchUrl;
      }
    }
  }

  // Function to create and insert the search bar
  function createSearchBar() {
    const searchBar = document.createElement("input");
    searchBar.type = "text";
    searchBar.className = "custom-search-bar";
    searchBar.id = "newSearchBar";
    searchBar.placeholder = "Search...";

    // Add event listener for the keypress event
    searchBar.addEventListener("keypress", handleSearch);

    return searchBar;
  }

  async function isCustomList() {
    // Check for the primary condition
    chapterIdentifier = document.querySelector(
      'span[style="font-size: 14px; color:green;"]'
    );
    if (chapterIdentifier) {
      return true; // Return true if chapterIdentifier is found
    }

    // Check for the secondary condition
    const lid = extractLid();
    if (!lid) {
      return false; // Return false if lid is not found
    }

    const listURL = `${window.location.origin}/reading-list/?list=${lid}`;
    const controller = new AbortController();
    const signal = controller.signal;

    const manualString = 'class="stEdit"';
    const normalString = 'id="bmicon"';

    try {
      const response = await fetch(listURL, {
        method: "GET",
        credentials: "include",
        signal: signal,
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let partialContent = "";
      let { value: chunk, done: readerDone } = await reader.read();

      while (!readerDone) {
        partialContent += decoder.decode(chunk, { stream: true });

        if (partialContent.includes(manualString)) {
          controller.abort(); // Abort the fetch request
          console.log("Custom list detected while fetching partially.");
          return true; // manualString found
        }

        if (partialContent.includes(normalString)) {
          controller.abort(); // Abort the fetch request
          console.log("Normal list detected while fetching partially.");
          return false; // normalString found
        }

        ({ value: chunk, done: readerDone } = await reader.read());
      }

      // Handle the last chunk
      partialContent += decoder.decode();
      if (partialContent.includes(manualString)) {
        console.log("Custom list detected.");
        return true;
      }
      if (partialContent.includes(normalString)) {
        console.log("Normal list detected.");
        return false;
      }

      return false; // Neither string found
    } catch (error) {
      if (error.name === "AbortError") {
        // Fetch aborted due to finding one of the strings
        return false; // default to false if manualString causes abortion
      } else {
        console.error("Error fetching or processing data:", error);
        return false; // Return false on error
      }
    }
  }

  function ExtractChapterPlaceholder() {
    if (chapterIdentifier) {
      const raw_chapter_number = chapterIdentifier.textContent.trim();

      // Regular expression with named capture groups
      const match = raw_chapter_number.match(
        /^\(?(?:v(?<vol>\d+))?(?<chpfx>c|ch)?(?<ch>\d+(?:\.\d+)?)(?<chsfx>[a-zA-Z0-9\s]*)\)?/i
      );

      if (match) {
        // Extract the volume number (only if it is preceded by 'v' or 'vol')
        const volume_number = match.groups.vol
          ? parseInt(match.groups.vol, 10)
          : null; // Volume number or null

        // Determine the chapter number and suffix
        const chapter_prefix = match.groups.chpfx || null; // Chapter prefix
        const chapter_number = match.groups.ch
          ? parseFloat(match.groups.ch)
          : null; // Chapter number (float if needed)
        const chapter_suffix = match.groups.chsfx || null; // Capture optional chapter suffix

        custom_chapter_number = {
          vol_number: volume_number, // Volume number or null
          ch_prefix: chapter_prefix, // Chapter prefix or null
          ch_number: chapter_number, // Chapter number (float if needed)
          ch_suffix: chapter_suffix, // Chapter suffix or null
        };

        console.log(custom_chapter_number);
        return true;
      }
    }

    custom_chapter_number = null; // Reset if no match is found
    return false;
  }

  function CreateInputBox() {
    // Create the input box
    inputBox = document.createElement("input");
    inputBox.type = "text";
    inputBox.className = "input-box";
    inputBox.placeholder = "Enter Chapter Number...";
    return;
  }

  function CreateSubmitButton() {
    // Create the button
    button = document.createElement("button");
    button.className = "submit-button";
    button.textContent = "Submit";
    return;
  }

  // Function to create custom list navigation links
  function CreateCustomListNavigationLinks() {
    // Create a document fragment to hold the links
    navlinksfragment = document.createDocumentFragment();

    // Create the links
    navlinks = [
      { text: "-1", title: "Decrement Chapter -1", delta: -1 },
      { text: "-5", title: "Decrement Chapter -5", delta: -5 },
      { text: "-10", title: "Decrement Chapter -10", delta: -10 },
      { text: "+1", title: "Increment Chapter +1", delta: 1 },
      { text: "+5", title: "Increment Chapter +5", delta: 5 },
      { text: "+10", title: "Increment Chapter +10", delta: 10 },
    ];

    navlinks.forEach((link) => {
      const a = document.createElement("a");
      a.href = "javascript:void(0)";
      a.title = link.title;
      a.innerHTML = `<u>${link.text}</u>`;
      a.className = "custom-link"; // Add a class to each link
      navlinksfragment.appendChild(a); // Append the link to the fragment
      link.element = a; // Store the created element in the link object
    });
    return;
  }

  // Function to create the custom list modifier box
  function createCustomListModifier() {
    // Create a container for the input box and submit button
    const container = document.createElement("div");
    container.className = "submit-button-container";

    CreateInputBox();
    CreateSubmitButton();
    CreateCustomListNavigationLinks(); // Get the links fragment

    // Append the input box and button to the container
    container.appendChild(inputBox);
    container.appendChild(button);
    container.appendChild(navlinksfragment); // Append the links fragment to the container

    // Find the <h4 class="seriesother"> element
    const seriesOtherElement = document.querySelector("h4.seriesother");
    if (seriesOtherElement) {
      // Append the container to the <h4 class="seriesother"> element
      seriesOtherElement.appendChild(container);
    }

    CustomListEventListeners();
  }

  function CustomListEventListeners() {
    // Add event listener to the submit button
    button.addEventListener("click", async () => {
      const tdata = inputBox.value.trim();
      if (!tdata) return;
      await ChangeChapter(tdata);
    });

    // Add event listeners to the navigation links
    navlinks.forEach((link) => {
      const a = link.element; // Use the stored element
      if (a) {
        a.addEventListener("click", async () => {
          const delta = link.delta;
          await ChangeChapter(custom_chapter_number.ch_number + delta);
        });
      }
    });
  }

  async function ChangeChapter(chapter) {
    // Extract sid and lid from the webpage
    const sid = extractSid();
    const lid = extractLid();
    if (!sid || !lid) {
      console.error("Failed to retrieve required values (SID or LID).");
      updateUI(chapterIdentifier, chapter, inputBox, button, false);
      return;
    }

    const updateURL = `https://www.novelupdates.com/readinglist_manualupdate.php?tdata=${encodeURIComponent(
      chapter
    )}&sid=${sid}&lid=${lid}`;

    // Create an AbortController to handle the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Set timeout to 5000ms (5 seconds)

    let success = false;

    try {
      const response = await fetch(updateURL, { signal: controller.signal });
      clearTimeout(timeoutId); // Clear the timeout if the request completes in time
      ExtractChapterPlaceholder();
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.text();
      console.log("Success:", data);
      success = true;
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Fetch request timed out");
      } else {
        console.error("Error:", error);
      }
    } finally {
      const reconstructedChapter = `${
        custom_chapter_number.ch_prefix || ""
      }${chapter}${custom_chapter_number.ch_suffix || ""}`;
      updateUI(
        chapterIdentifier,
        reconstructedChapter,
        inputBox,
        button,
        success
      );
      ExtractChapterPlaceholder();
    }
  }

  // Extract SID (Series ID) value from the page
  function extractSid() {
    const sidElement = document.querySelector(
      'i[class*="fa-sticky-note-o seriesnotes sid"]'
    );
    if (!sidElement) {
      console.error("SID element not found");
      return null;
    }
    const sidClass = Array.from(sidElement.classList).find((cls) =>
      cls.startsWith("sid")
    );
    return sidClass ? sidClass.replace("sid", "") : null;
  }

  // Extract LID (List ID) value from the page
  function extractLid() {
    const sttitleElement = document.querySelector(
      'span.sttitle a[href*="reading-list/?list="]'
    );
    if (!sttitleElement) {
      console.error("List ID element not found");
      return null;
    }
    const lidMatch = sttitleElement.href.match(/list=(\d+)/);
    return lidMatch ? lidMatch[1] : null;
  }

  // Update the UI on successful or failed submission
  function updateUI(spanElement, tdata, inputBox, button, result) {
    // Update a part of the webpage with the response data if successful
    if (result) {
      spanElement.textContent = ` (${tdata})`;
    }

    // Store the original button text
    const originalButtonText = button.textContent;

    // Set the button's min-width to its current width to preserve size
    const buttonWidth = button.offsetWidth;
    button.style.minWidth = `${buttonWidth}px`;

    // Flash the button to indicate success or failure
    if (result) {
      button.textContent = "✔"; // Change the button text to a tick mark
      button.classList.add("success");
      // Clear the text box
      inputBox.value = "";
    } else {
      button.textContent = "✖"; // Change the button text to an X mark
      button.classList.add("failure");
    }

    setTimeout(() => {
      button.classList.remove("success", "failure");
      button.textContent = originalButtonText; // Revert back to the original text
      button.style.minWidth = ""; // Reset the min-width
    }, 500); // Remove the class and revert text after 500ms
  }

  // Function to add the search bar to the DOM
  function addSearchBar(targetElement) {
    if (enableSearchBar && !document.getElementById("newSearchBar")) {
      const searchBar = createSearchBar();
      targetElement.appendChild(searchBar);
    }
  }

  // Check for logged-in status
  function isUserLoggedIn() {
    const usernameElement = document.querySelector(".username");
    return usernameElement !== null;
  }

  /**
   * Observes the DOM for the presence of an element with the specified ID within a parent class.
   * @param {string} targetId - The ID of the target element to observe.
   * @param {string} parentClass - The class selector of the parent element.
   * @param {number} timeout - Optional timeout in milliseconds (default: 10000ms).
   * @returns {Promise<Element>} - Resolves with the target element when found.
   */
  function observeDOM(targetId, parentClass, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const parentElement = document.querySelector(parentClass);
      if (!parentElement) {
        return reject(
          new Error(`Parent element with class "${parentClass}" not found.`)
        );
      }

      let targetElement = document.getElementById(targetId);
      if (targetElement) {
        return resolve(targetElement);
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.id === targetId) {
              observer.disconnect();
              return resolve(node);
            }
          }
        }
      });

      observer.observe(parentElement, { childList: true, subtree: true });

      // Implement timeout to avoid infinite waiting
      setTimeout(() => {
        observer.disconnect();
        reject(
          new Error(
            `Timeout: Element with ID "${targetId}" not found within ${timeout}ms.`
          )
        );
      }, timeout);
    });
  }
  function isSeriesPage() {
    return window.location.href.startsWith(
      "https://www.novelupdates.com/series/"
    );
  }
  async function init() {
    try {
      const targetElement = await observeDOM(
        "menu_username_right",
        ".l-subheader-h.i-widgets.i-cf",
        10000 // Optional: customize timeout as needed
      );
      addSearchBar(targetElement);

      if (!isUserLoggedIn()) {
        return;
      }

      if (!isSeriesPage()) {
        return;
      }

      const customListExists = await isCustomList();
      if (customListExists) {
        ExtractChapterPlaceholder();
        createCustomListModifier();
      } else {
        console.log("Custom list not found, continuing execution...");
      }
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }

  init();
})();
