import React, {Component, PropTypes} from 'react';
import classNames from 'classnames';
import debounce from 'lodash/debounce';
import range from 'lodash/range';
import {emptyFn, ScrollSpeed, keyCodes} from '../utils';
import defaultDisplayOptions from '../utils/defaultDisplayOptions';
import defaultLocale from '../utils/defaultLocale';
import defaultTheme from '../utils/defaultTheme';
import Today, {DIRECTION_UP, DIRECTION_DOWN} from '../Today';
import Header from '../Header';
import MonthList from '../MonthList';
import Weekdays from '../Weekdays';
import Years from '../Years';

import parse from 'date-fns/parse';
import format from 'date-fns/format';
import addDays from 'date-fns/add_days';
import isSameDay from 'date-fns/is_same_day';
import isBefore from 'date-fns/is_before';
import isAfter from 'date-fns/is_after';
import getDay from 'date-fns/get_day';
import startOfMonth from 'date-fns/start_of_month';
import startOfDay from 'date-fns/start_of_day';

const styles = {
  container: require('./Container.scss'),
  day: require('../Day/Day.scss'),
};

export default class Calendar extends Component {
  constructor(props) {
    super(props);

    const displayOptions = this.getDisplayOptions(props.displayOptions);

    this.updateYears(props);

    this.state = {
      display: props.display,
      selectedDate: this.parseSelectedDate(props.selectedDate),
      shouldHeaderAnimate: displayOptions.shouldHeaderAnimate,
    };
  }
  static defaultProps = {
    autoFocus: true,
    display: 'days',
    displayOptions: {},
    height: 500,
    keyboardSupport: true,
    max: new Date(2050, 11, 31),
    maxDate: new Date(2050, 11, 31),
    min: new Date(1980, 0, 1),
    minDate: new Date(1980, 0, 1),
    onHighlightedDateChange: emptyFn,
    onKeyDown: emptyFn,
    onScroll: emptyFn,
    onScrollEnd: emptyFn,
    onSelect: emptyFn,
    rowHeight: 56,
    selectedDate: new Date(),
    shouldPreventSelect: () => false,
    tabIndex: 1,
    width: 400,
  };
  static propTypes = {
    autoFocus: PropTypes.bool,
    className: PropTypes.string,
    disabledDates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    disabledDays: PropTypes.arrayOf(PropTypes.number),
    markedDates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    display: PropTypes.oneOf(['years', 'days']),
    displayOptions: PropTypes.shape({
      hideYearsOnSelect: PropTypes.bool,
      layout: PropTypes.oneOf(['portrait', 'landscape']),
      overscanMonthCount: PropTypes.number,
  		shouldHeaderAnimate: PropTypes.bool,
      showHeader: PropTypes.bool,
  		showOverlay: PropTypes.bool,
  		showTodayHelper: PropTypes.bool,
      todayHelperRowOffset: PropTypes.number,
    }),
    height: PropTypes.number,
    keyboardSupport: PropTypes.bool,
    locale: PropTypes.shape({
      blank: PropTypes.string,
      headerFormat: PropTypes.string,
      todayLabel: PropTypes.shape({
        long: PropTypes.string,
        short: PropTypes.string,
      }),
      weekdays: PropTypes.arrayOf(PropTypes.string),
      weekStartsOn: PropTypes.oneOf([0, 1, 2, 3, 4, 5, 6]),
    }),
    max: PropTypes.instanceOf(Date),
    maxDate: PropTypes.instanceOf(Date),
    min: PropTypes.instanceOf(Date),
    minDate: PropTypes.instanceOf(Date),
    onHighlightedDateChange: PropTypes.func,
    onKeyDown: PropTypes.func,
    onScroll: PropTypes.func,
    onScrollEnd: PropTypes.func,
    onSelect: PropTypes.func,
    rowHeight: PropTypes.number,
    selectedDate: PropTypes.instanceOf(Date),
    shouldPreventSelect: PropTypes.func,
    tabIndex: PropTypes.number,
    theme: PropTypes.shape({
      floatingNav: PropTypes.shape({
        background: PropTypes.string,
        chevron: PropTypes.string,
        color: PropTypes.string,
      }),
      headerColor: PropTypes.string,
      selectionColor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      textColor: PropTypes.shape({
        active: PropTypes.string,
        default: PropTypes.string,
      }),
      todayColor: PropTypes.string,
      weekdayColor: PropTypes.string,
    }),
    width: PropTypes.number,
  };
  componentDidMount() {
    let {autoFocus, keyboardSupport} = this.props;

    if (keyboardSupport && autoFocus) {
      this.node.focus();
    }
  }
  componentWillReceiveProps(next) {
    let {min, minDate, max, maxDate, selectedDate} = this.props;
    let {display} = this.state;

    if (next.min !== min || next.minDate !== minDate || next.max !== max || next.maxDate !== maxDate) {
      this.updateYears(next);
    }
    if (next.selectedDate !== selectedDate) {
      var parsed = this.parseSelectedDate(next.selectedDate);
      this.setState({
        selectedDate: parsed,
      });
      if(parsed) this.scrollToDate(parsed,-this.props.rowHeight*2);
    } else if (next.minDate !== minDate || next.maxDate !== maxDate) {
			// Need to make sure the currently selected date is not before the new minDate or after maxDate
      let _selectedDate = this.parseSelectedDate(this.state.selectedDate);
      if (!isSameDay(_selectedDate, this.state.selectedDate)) {
        this.setState({
          selectedDate: _selectedDate,
        });
      }
    }
    if (next.display !== display) {
      this.setState({
        display: next.display,
      });
    }
  }
  parseSelectedDate(selectedDate) {
    if (!selectedDate) { return null; }

    selectedDate = parse(selectedDate);

		// Selected Date should not be before min date or after max date
    if (isBefore(selectedDate, this._minDate)) {
      return this._minDate;
    } else if (isAfter(selectedDate, this._maxDate)) {
      return this._maxDate;
    }

    return startOfDay(new Date(selectedDate));
  }
  updateYears(props = this.props) {
    this._min = parse(props.min);
    this._max = parse(props.max);
    this._minDate = parse(props.minDate);
    this._maxDate = parse(props.maxDate);

    let min = this._min.getFullYear();
    let max = this._max.getFullYear();

    const months = [];
    let year, month;
    for (year = min; year <= max; year++) {
      for (month = 0; month < 12; month++) {
        months.push({month, year});
      }
    }

    this.months = months;
  }
  getDisabledDates(disabledDates) {
    return disabledDates && disabledDates.map((date) => format(parse(date), 'YYYY-MM-DD'));
  }
  getMarkedDates(markedDates) {
    return markedDates && markedDates.map((date) => format(parse(date), 'YYYY-MM-DD'));
  }
  getDisplayOptions(displayOptions = this.props.displayOptions) {
    return Object.assign({}, defaultDisplayOptions, displayOptions);
  }
  getLocale() {
    return Object.assign({}, defaultLocale, this.props.locale);
  }
  getTheme() {
    return Object.assign({}, defaultTheme, this.props.theme);
  }
  onDaySelect = (selectedDate, e, shouldHeaderAnimate = this.state.shouldHeaderAnimate) => {
    let {shouldPreventSelect, onSelect} = this.props;

    if (!shouldPreventSelect(selectedDate)) {
      onSelect(selectedDate, e);

      this.setState({
        highlightedDate: new Date(selectedDate),
        selectedDate,
        shouldHeaderAnimate,
      }, this.clearHighlight);
    }
  };
  getCurrentOffset = () => {
    return this.scrollTop;
  }
  getDateOffset = (date) => {
    return this._MonthList && this._MonthList.getDateOffset(date);
  };
  scrollTo = (offset) => {
    return this._MonthList && this._MonthList.scrollTo(offset);
  }
  scrollToDate = (date = new Date(), offset) => {
    return this._MonthList && this._MonthList.scrollToDate(date, offset);
  };
  getScrollSpeed = new ScrollSpeed().getScrollSpeed;
  onScroll = ({scrollTop}) => {
    const {onScroll} = this.props;
    const {isScrolling} = this.state;
    const {showTodayHelper, showOverlay} = this.getDisplayOptions();
    const scrollSpeed = this.scrollSpeed = Math.abs(this.getScrollSpeed(scrollTop));
    this.scrollTop = scrollTop;

		// We only want to display the months overlay if the user is rapidly scrolling
    if (showOverlay && scrollSpeed >= 50 && !isScrolling) {
      this.setState({
        isScrolling: true,
      });
    }

    if (showTodayHelper) {
      this.updateTodayHelperPosition(scrollSpeed);
    }

    onScroll(scrollTop);
    this.onScrollEnd();
  };
  onScrollEnd = debounce(() => {
    const {onScrollEnd} = this.props;
    const {isScrolling} = this.state;
    const {showTodayHelper} = this.getDisplayOptions();

    if (isScrolling) {
      this.setState({isScrolling: false});
    }

    if (showTodayHelper) {
      this.updateTodayHelperPosition(0);
    }

    onScrollEnd(this.scrollTop);
  }, 150);
  updateTodayHelperPosition = (scrollSpeed) => {
    const today = this.today;
    const scrollTop = this.scrollTop;
    const {showToday} = this.state;
    const {height, rowHeight} = this.props;
    const {todayHelperRowOffset} = this.getDisplayOptions();
    let newState;

    if (!this._todayOffset) {
      this._todayOffset = (
				this.getDateOffset(today) + // scrollTop offset of the month "today" is in
				Math.ceil((today.getDate() - 7 + getDay(startOfMonth(today))) / 7) * rowHeight // offset of "today" within its month
			);
    }

    if (scrollTop >= this._todayOffset + rowHeight * (todayHelperRowOffset+1)) {
      if (showToday !== DIRECTION_UP) newState = DIRECTION_UP; //today is above the fold
    } else if (scrollTop + height <= this._todayOffset + rowHeight - rowHeight * (todayHelperRowOffset+1)) {
      if (showToday !== DIRECTION_DOWN) newState = DIRECTION_DOWN; //today is below the fold
    } else if (showToday && scrollSpeed <= 1) {
      newState = false;
    }

    if (scrollTop === 0) {
      newState = false;
    }

    if (newState != null) {
      this.setState({showToday: newState});
    }
  };
  handleKeyDown = (e) => {
    const {maxDate, minDate, onHighlightedDateChange, onKeyDown} = this.props;
    let {display, selectedDate, highlightedDate, showToday} = this.state;
    let delta = 0;

    onKeyDown(e);

    if ([keyCodes.left, keyCodes.up, keyCodes.right, keyCodes.down].indexOf(e.keyCode) > -1 && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (!selectedDate) {
      selectedDate = new Date();
    }

    if (display === 'days') {
      if (!highlightedDate) {
        highlightedDate = new Date(selectedDate);
        this.setState({highlightedDate});
      }

      switch (e.keyCode) {
        case keyCodes.enter:
          this.onDaySelect(new Date(highlightedDate), e);
          return;
        case keyCodes.left:
          delta = -1;
          break;
        case keyCodes.right:
          delta = +1;
          break;
        case keyCodes.down:
          delta = +7;
          break;
        case keyCodes.up:
          delta = -7;
          break;
        default:
          delta = 0;
      }

      if (delta) {
        let {rowHeight} = this.props;
        let newHighlightedDate = addDays(highlightedDate, delta);

				// Make sure the new highlighted date isn't before min / max
        if (isBefore(newHighlightedDate, minDate)) {
          newHighlightedDate = new Date(minDate);
        } else if (isAfter(newHighlightedDate, maxDate)) {
          newHighlightedDate = new Date(maxDate);
        }

				// Update the highlight indicator
        this.clearHighlight();

				// Scroll the view
        if (!this.currentOffset) this.currentOffset = this.getCurrentOffset();
        let currentOffset = this.currentOffset;
        let monthOffset = this.getDateOffset(newHighlightedDate);
        let navOffset = (showToday) ? 36 : 0;

        let highlightedEl = this.highlightedEl = this.node.querySelector(`[data-date='${format(newHighlightedDate, 'YYYY-MM-DD')}']`);

				// Edge-case: if the user tries to use the keyboard when the new highlighted date isn't rendered because it's too far off-screen
				// We need to scroll to the month of the new highlighted date so it renders
        if (!highlightedEl) {
          this.scrollTo(monthOffset - navOffset);
          return;
        }

        highlightedEl.classList.add(styles.day.highlighted);

        let dateOffset = highlightedEl.offsetTop - rowHeight;
        let newOffset = monthOffset + dateOffset;


        if (currentOffset !== newOffset) {
          this.currentOffset = newOffset;
          this.scrollTo(newOffset - navOffset);
        }

				// Update the reference to the currently highlighted date
        this.setState({
          highlightedDate: newHighlightedDate,
        }, () => onHighlightedDateChange(newHighlightedDate));

      }
    } else if (display === 'years' && this._Years) {
      this._Years.handleKeyDown(e);
    }
  };
  clearHighlight = () => {
    if (this.highlightedEl) {
      this.highlightedEl.classList.remove(styles.day.highlighted);
      this.highlightedEl = null;
    }
  }
  setDisplay = (display) => {
    this.setState({display});
  }
  sanitizeDate(date, disabledDates = this.getDisabledDates()) {
    const {disabledDays} = this.props;

    if (!date) { return null; }

    // Selected date should not be disabled
    if (
      disabledDates && disabledDates.indexOf(format(date, 'YYYY-MM-DD')) !== -1 ||
      disabledDays && disabledDays.indexOf(getDay(date)) !== -1
    ) {
      return null;
    }

    return date;
  }
  render() {
    let {
			className,
			disabledDays,
			height,
			keyboardSupport,
			minDate,
			maxDate,
			tabIndex,
			width,
			...other
		} = this.props;
    const {
      hideYearsOnSelect,
      layout,
      overscanMonthCount,
      showHeader,
      showOverlay,
      showTodayHelper,
    } = this.getDisplayOptions();
    const {display, isScrolling, showToday, shouldHeaderAnimate} = this.state;
    const disabledDates = this.getDisabledDates(this.props.disabledDates);
    const markedDates = this.getMarkedDates(this.props.markedDates);
    const selectedDate = this.sanitizeDate(this.state.selectedDate, disabledDates);
    const locale = this.getLocale();
    const theme = this.getTheme();
    const today = this.today = startOfDay(new Date());

    return (
      <div
        tabIndex={tabIndex}
        onKeyDown={keyboardSupport && this.handleKeyDown}
        className={classNames(className, styles.container.root, {
          [styles.container.landscape]: layout === 'landscape',
        })}
        style={{color: theme.textColor.default, width}}
        aria-label="Calendar"
        ref={node => {
          this.node = node;
        }}
      >
        {showHeader &&
          <Header
            selectedDate={selectedDate}
            shouldHeaderAnimate={shouldHeaderAnimate}
            layout={layout}
            theme={theme}
            locale={locale}
            scrollToDate={this.scrollToDate}
            setDisplay={this.setDisplay}
            display={display}
          />
        }
        <div className={styles.container.wrapper}>
          <Weekdays weekdays={locale.weekdays} weekStartsOn={locale.weekStartsOn} theme={theme} />
          <div className={styles.container.listWrapper}>
            {showTodayHelper &&
              <Today
                scrollToDate={this.scrollToDate}
                show={showToday}
                today={today}
                theme={theme}
                todayLabel={locale.todayLabel.long}
              />
            }
            <MonthList
              ref={instance => {
                this._MonthList = instance;
              }}
              {...other}
              width={width}
              height={height}
              selectedDate={selectedDate}
              disabledDates={disabledDates}
              disabledDays={disabledDays}
              markedDates={markedDates}
              months={this.months}
              onDaySelect={this.onDaySelect}
              onScroll={this.onScroll}
              isScrolling={isScrolling}
              today={today}
              min={this._min}
              minDate={this._minDate}
              maxDate={this._maxDate}
              theme={theme}
              locale={locale}
              overscanMonthCount={overscanMonthCount}
              showOverlay={showOverlay}
            />
          </div>
          {display === 'years' &&
            <Years
              ref={instance => {
                this._Years = instance;
              }}
              width={width}
              height={height}
              onDaySelect={this.onDaySelect}
              minDate={minDate}
              maxDate={maxDate}
              selectedDate={selectedDate}
              theme={theme}
              today={today}
              years={range(this._min.getFullYear(), this._max.getFullYear() + 1)}
              setDisplay={this.setDisplay}
              scrollToDate={this.scrollToDate}
              hideYearsOnSelect={hideYearsOnSelect}
            />
          }
        </div>
      </div>
    );
  }
}
