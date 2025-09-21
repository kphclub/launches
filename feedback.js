document.addEventListener('DOMContentLoaded', function () {
  const baseUrl = 'https://kph-mafia.microcompany.workers.dev';
  const hackathonApiUrl = `${baseUrl}/api/hackathon/launches`;
  const repliesApiUrl = `${baseUrl}/api/hackathon/replies`;

  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const projectContentEl = document.getElementById('project-content');
  const commentsListEl = document.getElementById('comments-list');
  const commentsHeaderEl = document.getElementById('comments-header');

  // Get message ID from URL parameters
  function getMessageIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
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
    if (!dateString) return 'recently';

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

  // Find project by message ID
  function findProject(projects, messageId) {
    return projects.find((project) => project.message_id === messageId);
  }

  // Render project details
  function renderProject(project) {
    const hasLink = project.link && project.link.trim() !== '';
    const fullUrl =
      hasLink && !project.link.startsWith('http')
        ? 'https://' + project.link
        : project.link;
    const domain = hasLink ? extractDomain(project.link) : '';
    const formattedDate = formatDate(project.created_at);
    const reactionCount = project.reactionCount || 0;

    // Update project details
    const projectNameEl = document.getElementById('project-name');
    const projectLinkEl = document.getElementById('project-link');

    projectNameEl.textContent = project.name;

    if (hasLink) {
      projectLinkEl.href = fullUrl;
      projectLinkEl.style.display = 'inline';
    } else {
      projectLinkEl.style.display = 'none';
      // Create a non-clickable span for the project name
      projectLinkEl.parentNode.innerHTML = `<span>${project.name}</span><span class="project-domain" id="project-domain"></span>`;
    }

    document.getElementById('project-description').textContent =
      project.description || '';
    document.getElementById('project-author').textContent = project.memberName;
    document.getElementById('project-date').textContent = formattedDate;
    document.getElementById(
      'project-reactions'
    ).textContent = `${reactionCount} reaction${
      reactionCount === 1 ? '' : 's'
    }`;

    const domainEl = document.getElementById('project-domain');
    if (domainEl && domain) {
      domainEl.textContent = `(${domain})`;
    } else if (domainEl) {
      domainEl.textContent = '';
    }

    // Update page title
    document.title = `${project.name} | KPH Hackathon Feedback`;
  }

  // Render comments
  function renderComments(replies) {
    if (!replies || replies.length === 0) {
      commentsListEl.innerHTML =
        '<div class="no-comments">No feedback yet for this project.</div>';
      commentsHeaderEl.textContent = 'Feedback';
      return;
    }

    commentsHeaderEl.textContent = `Feedback (${replies.length})`;

    let html = '';
    replies.forEach((reply) => {
      const formattedDate = formatDate(reply.created_at);

      html += `
        <div class="comment">
          <div class="comment-header">
            <span class="comment-author">${reply.memberName}</span>
            <span class="comment-date">${formattedDate}</span>
          </div>
          <div class="comment-text">${reply.message}</div>
        </div>
      `;
    });

    commentsListEl.innerHTML = html;
  }

  // Load project and comments
  function loadProjectAndComments(messageId) {
    if (!messageId) {
      showError('No project ID specified in URL');
      return;
    }

    // Load all projects first to find the specific one
    fetch(hackathonApiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load projects');
        }
        return response.json();
      })
      .then((data) => {
        if (!data.launches || !Array.isArray(data.launches)) {
          throw new Error('Invalid projects data');
        }

        const project = findProject(data.launches, messageId);
        if (!project) {
          throw new Error('Project not found');
        }

        renderProject(project);

        // Load comments
        return fetch(`${repliesApiUrl}/${messageId}`);
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load comments');
        }
        return response.json();
      })
      .then((data) => {
        loadingEl.style.display = 'none';
        projectContentEl.style.display = 'block';
        renderComments(data.replies);
      })
      .catch((error) => {
        console.error('Error loading project and comments:', error);
        showError(error.message);
      });
  }

  // Show error message
  function showError(message) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = `Error: ${message}`;
  }

  // Initialize page
  const messageId = getMessageIdFromUrl();
  loadProjectAndComments(messageId);
});
