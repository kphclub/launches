document.addEventListener('DOMContentLoaded', function () {
  const baseUrl = 'https://kph-mafia.microcompany.workers.dev';
  const hackathonApiUrl = `${baseUrl}/api/hackathon/launches`;
  const repliesApiUrl = `${baseUrl}/api/hackathon/replies`;

  const projectListEl = document.getElementById('project-list');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const homeLink = document.getElementById('home-link');

  let allProjects = [];
  let votedProjects = new Set();

  // Load voted projects from localStorage
  function loadVotedProjects() {
    const stored = localStorage.getItem('kph-hackathon-votes');
    if (stored) {
      votedProjects = new Set(JSON.parse(stored));
    }
  }

  // Save voted projects to localStorage
  function saveVotedProjects() {
    localStorage.setItem(
      'kph-hackathon-votes',
      JSON.stringify([...votedProjects])
    );
  }

  // Handle vote click
  function handleVote(messageId, event) {
    event.preventDefault();
    event.stopPropagation();

    const voteEl = event.target;
    if (votedProjects.has(messageId)) {
      votedProjects.delete(messageId);
      voteEl.classList.remove('voted');
    } else {
      votedProjects.add(messageId);
      voteEl.classList.add('voted');
    }

    saveVotedProjects();
  }

  // Extract domain from URL
  function extractDomain(url) {
    if (!url) return '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return 'just now';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

      if (diffInHours < 1) {
        return 'just now';
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
          return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
        } else {
          return date.toLocaleDateString();
        }
      }
    } catch (e) {
      return 'recently';
    }
  }

  // Toggle comments visibility
  function toggleComments(messageId, event) {
    event.preventDefault();

    const commentsSection = document.getElementById(`comments-${messageId}`);
    const toggleLink = event.target;

    if (
      commentsSection.style.display === 'none' ||
      commentsSection.style.display === ''
    ) {
      // Load and show comments
      loadComments(messageId, commentsSection, toggleLink);
    } else {
      // Hide comments
      commentsSection.style.display = 'none';
      toggleLink.textContent = toggleLink.textContent.replace(
        'hide',
        'feedback'
      );
    }
  }

  // Load comments for a project
  function loadComments(messageId, commentsSection, toggleLink) {
    toggleLink.textContent = 'loading...';

    fetch(`${repliesApiUrl}/${messageId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load comments');
        }
        return response.json();
      })
      .then((data) => {
        if (data.replies && data.replies.length > 0) {
          renderComments(data.replies, commentsSection);
          commentsSection.style.display = 'block';
          toggleLink.textContent = `hide (${data.replies.length})`;
        } else {
          commentsSection.innerHTML =
            '<div class="comment">No comments yet.</div>';
          commentsSection.style.display = 'block';
          toggleLink.textContent = 'hide';
        }
      })
      .catch((error) => {
        console.error('Error loading comments:', error);
        commentsSection.innerHTML =
          '<div class="comment" style="color: #ff6600;">Failed to load comments.</div>';
        commentsSection.style.display = 'block';
        toggleLink.textContent = 'hide';
      });
  }

  // Render comments
  function renderComments(replies, commentsSection) {
    let html = '';

    replies.forEach((reply) => {
      const formattedDate = formatDate(reply.created_at);

      html += `
                <div class="comment">
                    <div class="comment-author">${reply.memberName}</div>
                    <div class="comment-date">${formattedDate}</div>
                    <div class="comment-text">${reply.message}</div>
                </div>
            `;
    });

    commentsSection.innerHTML = html;
  }

  // Render projects in Hacker News style
  function renderProjects(projects) {
    if (projects.length === 0) {
      projectListEl.innerHTML =
        '<div style="text-align: center; color: #828282; padding: 20px;">No hackathon projects found.</div>';
      return;
    }

    let html = '';

    projects.forEach((project, index) => {
      const rank = index + 1;
      const domain = extractDomain(project.link);
      const formattedDate = formatDate(project.created_at);
      const isVoted = votedProjects.has(project.message_id);
      const reactionCount = project.reactionCount || 0;

      html += `
                <div class="item">
                    <div class="item-line">
                        <div class="rank">${rank}.</div>
                        <div class="vote ${
                          isVoted ? 'voted' : ''
                        }" onclick="handleVote('${
        project.message_id
      }', event)"></div>
                         <div class="title">
                             <a href="${project.link}" target="_blank">${
        project.name
      }</a>
                             ${
                               domain
                                 ? `<span class="domain">(<a href="${project.link}" target="_blank">${domain}</a>)</span>`
                                 : ''
                             }
                         </div>
                    </div>
                    <div class="description">${project.description || ''}</div>
                    <div class="subtext">
                        by <strong>${project.memberName}</strong>
                        ${formattedDate} |
                        ${reactionCount} reaction${
        reactionCount === 1 ? '' : 's'
      } |
                         <a href="#" class="toggle-comments feedback-link" onclick="toggleComments('${
                           project.message_id
                         }', event)">${
        project.replyCount ? `${project.replyCount} feedback` : 'feedback'
      }</a>
                    </div>
                    <div class="comments-section" id="comments-${
                      project.message_id
                    }"></div>
                    <div class="spacer"></div>
                </div>
            `;
    });

    projectListEl.innerHTML = html;
  }

  // Home link click handler
  if (homeLink) {
    homeLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.reload();
    });
  }

  // Make functions globally available
  window.handleVote = handleVote;
  window.toggleComments = toggleComments;

  // Load initial data
  loadVotedProjects();

  // Fetch hackathon projects
  fetch(hackathonApiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      loadingEl.style.display = 'none';

      if (data.launches && Array.isArray(data.launches)) {
        allProjects = data.launches;
        renderProjects(allProjects);
      } else {
        throw new Error('Invalid data format');
      }
    })
    .catch((error) => {
      console.error('Error fetching hackathon data:', error);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
    });
});
