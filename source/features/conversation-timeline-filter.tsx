import './conversation-timeline-filter.css';
import React from 'dom-chef';
import select from 'select-dom';
import elementReady from 'element-ready';
import {observe} from 'selector-observer';
import * as pageDetect from 'github-url-detection';

import features from '.';
import delay from 'delay';
import onNewComments from '../github-events/on-new-comments';

interface FilterSettings {
	HideUnresolved: boolean;
	HideResolved: boolean;
	hideNormalComment: boolean;
	HideCommits: boolean;
	AutoLoadHidden: boolean;
	HideOthers: boolean;
}

const CurrentSettings: FilterSettings =
{
	HideResolved: true,
	HideUnresolved: false,
	hideNormalComment: false,
	HideOthers: false,
	HideCommits: false,
	AutoLoadHidden: false
};

const hideUnresolvedSelectorId = 'hide-unresolved';
const hideResolvedSelectorId = 'hide-resolved';
const hideNormalCommentsSelectorId = 'hide-normal-comments';
const hideOthersSelectorId = 'hide-others';
const hideCommitsSelectorId = 'hide-commits';
const autoLoadHiddenSelectorId = 'auto-load-hidden';

const timelineFiltersSelectorId = 'timeline-filters';
const detailsSelector = `#${timelineFiltersSelectorId} details`;
const notiticationsSelector = '.discussion-sidebar-item.sidebar-notifications';
const timelineItemSelector = '.js-timeline-item';
const loadMoreSelector = '.ajax-pagination-btn:not([disabled])';
const discussionBucketSelector = "#discussion_bucket";

function regenerateFilterSummary(): void {
	const timelineFilter = select(`#${timelineFiltersSelectorId}`)!;
	const newSummary = (
		<p className="reason text-small text-gray">
			{ CurrentSettings.HideResolved &&
				<p>Hide resolved comments </p>
			}
			{ CurrentSettings.HideCommits &&
				<p>Hide commits </p>
			}
			{  CurrentSettings.HideUnresolved &&
				<p>Hide unresolved comments</p>
			}
			{ CurrentSettings.hideNormalComment &&
				<p>Hide normal comments </p>
			}
			{ CurrentSettings.HideOthers &&
				<p>Hide others </p>
			}
			{ CurrentSettings.AutoLoadHidden &&
				<p>Auto loading enabled </p>
			}
		</p>
	);

	select('p.reason', timelineFilter)!.replaceWith(newSummary);
}

function applyDisplay(element: HTMLElement, isHidden: boolean): void {
	if (isHidden) {
		element.style.display = 'none';
	} else {
		element.style.display = '';
	}
}

async function saveSettings(): Promise<any> {
	CurrentSettings.HideUnresolved = (select('#' + hideUnresolvedSelectorId) as HTMLInputElement)!.checked;
	CurrentSettings.HideResolved = (select('#' + hideResolvedSelectorId) as HTMLInputElement)!.checked;
	CurrentSettings.HideCommits = (select('#' + hideCommitsSelectorId) as HTMLInputElement)!.checked;
	CurrentSettings.hideNormalComment = (select('#' + hideNormalCommentsSelectorId) as HTMLInputElement)!.checked;
	CurrentSettings.HideOthers = (select('#' + hideOthersSelectorId) as HTMLInputElement)!.checked;
	CurrentSettings.AutoLoadHidden = (select('#' + autoLoadHiddenSelectorId) as HTMLInputElement)!.checked;

	// Close window
	select(detailsSelector)!.removeAttribute('open');

	regenerateFilterSummary();

	// #discussion_bucket

	const classOn = (element : HTMLElement, enabled : boolean, className : string) =>
	 enabled ? element.classList.add(className) : element.classList.remove(className);

	const discussionBucket = select(discussionBucketSelector)!;

	classOn(discussionBucket, CurrentSettings.HideUnresolved, ".rgh-filter-hide-unresolved-comments");
	classOn(discussionBucket, CurrentSettings.HideResolved, ".rgh-filter-hide-resolved-comments");
	classOn(discussionBucket, CurrentSettings.HideCommits, ".rgh-filter-hide-commits");
	classOn(discussionBucket, CurrentSettings.hideNormalComment, ".rgh-filter-hide-normal-comments");
	classOn(discussionBucket, CurrentSettings.HideOthers, ".rgh-filter-hide-others");

	if (CurrentSettings.AutoLoadHidden) {
		const loadMoreButton = select(loadMoreSelector);
		if (loadMoreButton) {
			await tryClickLoadMore(loadMoreButton);
		}
	}
}


function restoreSettings(): void {
	(select('#' + hideUnresolvedSelectorId) as HTMLInputElement)!.checked = CurrentSettings.HideUnresolved;
	(select('#' + hideResolvedSelectorId) as HTMLInputElement)!.checked = CurrentSettings.HideResolved;
	(select('#' + hideCommitsSelectorId) as HTMLInputElement)!.checked = CurrentSettings.HideCommits;
	(select('#' + hideNormalCommentsSelectorId) as HTMLInputElement)!.checked = CurrentSettings.hideNormalComment;
	(select('#' + hideOthersSelectorId) as HTMLInputElement)!.checked = CurrentSettings.HideOthers;
	(select('#' + autoLoadHiddenSelectorId) as HTMLInputElement)!.checked = CurrentSettings.AutoLoadHidden;
}

function createItem(form: JSX.Element, id: string, title: string, summary: string, isSelected: boolean, hasTopBorder: boolean): void {
	const element = (
		<label className={'d-block p-3 ' + (hasTopBorder ? 'border-top' : '')}>
			<div className="form-checkbox my-0">
				<input id={id} type="checkbox" name="id" value="unsubscribe" checked={isSelected}/> {title}
				<p className="note">
					{summary}
				</p>
			</div>
		</label>
	);

	form.append(element);
}

async function addTimelineItemsFilter(): Promise<void> {
	const notifications = await elementReady(notiticationsSelector);
	if (!notifications) {
		return;
	}

	// Copy existing element and adapt its content
	const timelineFilter = notifications.cloneNode(true);
	timelineFilter.id = 'timeline-filters';

	select('form.thread-subscribe-form', timelineFilter)!.remove();
	const summary = select('summary', timelineFilter)!;
	summary.setAttribute('aria-label', 'Customize timeline filters');
	select('div.text-bold', summary)!.textContent = 'Filters';

	createDetailsDialog(timelineFilter);
	notifications.after(timelineFilter);

	regenerateFilterSummary();
}

function createDetailsDialog(timelineFilter: Element): void {
	const detailsDialog = select('details-dialog', timelineFilter)!;

	detailsDialog.setAttribute('src', '');

	detailsDialog.setAttribute('aria-label', 'Timeline filter settings');
	select('div.Box-header h3', detailsDialog)!.textContent = 'Timeline filter settings';

	// Close button should restore previous settings.
	select('div.Box-header button', detailsDialog)!.addEventListener('click', restoreSettings);

	const form = <div/>;

	createItem(form, hideResolvedSelectorId, 'Hide resolved comments', '', CurrentSettings.HideResolved, false);
	createItem(form, hideCommitsSelectorId, 'Hide commits', '', CurrentSettings.HideCommits, true);
	createItem(form, hideUnresolvedSelectorId, 'Hide unresolved comments', '', CurrentSettings.HideUnresolved, true);
	createItem(form, hideNormalCommentsSelectorId, 'Hide normal comments', 'Hides comments that does not contain unresolved/resolved state.', CurrentSettings.hideNormalComment, true);
	createItem(form, hideOthersSelectorId, 'Hide other', 'Hides any other kind of activity that was not specified above.', CurrentSettings.HideOthers, true);
	createItem(form, autoLoadHiddenSelectorId, 'Load hidden', 'Automatically loads hidden timeline items.', CurrentSettings.AutoLoadHidden, true);

	const actionButtons = (
		<div className="Box-footer form-actions">
			<button type="submit" className="btn btn-primary" data-disable-with="Saving…" onClick={async () => saveSettings()}>Save</button>
			<button type="reset" className="btn" data-close-dialog="" onClick={() => restoreSettings()}>Cancel</button>
		</div>
	);

	form.append(actionButtons);

	// This works on github enterprise - form is already preloaded
	select('form', detailsDialog)?.remove();
	// This works on normal github. Normally form is loaded in place of `include-fragment` after we open details dialog.
	select('include-fragment', detailsDialog)?.remove();

	detailsDialog.append(form);
}

async function tryClickLoadMore(item: HTMLElement): Promise<any> {
	if (CurrentSettings.AutoLoadHidden) {
		// Just after loading page when user clicks that element he is redirected to some limbo. It happens because github javascript did not kick in yet.
		// To mitigate that we always give 1 second for javascript to load and notice this element so clicking it will be handled properly.
		await delay(1000);
		item.click();
	}
}

function processTimelineItem(item: HTMLElement): void {
	const pr = select('.js-comment[id^=pullrequestreview]', item);
	const commitGroup = select('.js-commit-group', item);
	const normalComment = select('.js-comment-container', item);

	if (pr) {
		processPR(item);
	} else if (commitGroup) {
		item.classList.add("rgh-is-commit");
	} else if (normalComment) {
		item.classList.add("rgh-is-normal-comment")
	} else {
		item.classList.add("rgh-is-other")
	}
}

function processPR(item: HTMLElement): void {
	for (const threadContainer of select.all('.js-resolvable-timeline-thread-container', item)) {
		const commentContainer = select('.inline-comment-form-container', threadContainer);

		if (threadContainer.getAttribute('data-resolved') === 'true') {
			threadContainer.classList.add("rgh-is-resolved-comment");
		} else if (commentContainer === null) {
			// There is 1 special case here when github shows you a comment that was added to previous comment thread but it does not show whether it is resolved or not resolved comment.
			// It's kinda tricky to know what to do with this so it is marked as normal comment for meantime.
			// We are just checking here if user is able to comment inside that timeline thread, if not then it means we have this special situation that was just described.
			threadContainer.classList.add("rgh-is-normal-comment");
		} else {
			threadContainer.classList.add("rgh-is-unresolved-comment");
		}
	}
}

async function init(): Promise<any> {
	await addTimelineItemsFilter();

	// There are some cases when github will remove this filter. In that case we need to add it again.
	// Example: Editing comment will make timeline filter to disappear.
	observe(`#${timelineFiltersSelectorId}`, {
		async remove() {
			await addTimelineItemsFilter();
		}
	});

	select
		.all(timelineItemSelector)
		.forEach(processTimelineItem);

	observe(loadMoreSelector, {
		async add(element) {
			await tryClickLoadMore(element as HTMLElement);
		}
	});
}

void features.add(__filebasename, {
	include: [
		pageDetect.isPRConversation,
		pageDetect.isIssue
	],
	additionalListeners: [
		onNewComments,
	],
	init
});
