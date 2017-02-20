import React, {PureComponent} from 'react';
import classNames from 'classnames';
import parse from 'date-fns/parse';
import styles from './Day.scss';

export default class Day extends PureComponent {
  handleClick = () => {
    let {date, isDisabled, onClick} = this.props;

    if (!isDisabled && typeof onClick === 'function') {
      onClick(parse(date));
    }
  }
  renderSelection() {
    const {
      day,
      date,
      isMarked,
      isToday,
      locale: {todayLabel},
      monthShort,
      theme: {selectionColor, markedSelectionColor, textColor},
    } = this.props;

    return (
      <div
        className={styles.selection}
        style={{
          backgroundColor: (
            typeof selectionColor === 'function'
              ? selectionColor(date, isMarked)
              : (isMarked ? markedSelectionColor : selectionColor)
          ),
          color: textColor.active,
        }}
      >
        <span className={styles.month}>
          {isToday ? todayLabel.short || todayLabel.long : monthShort}
        </span>
        <span className={styles.day}>{day}</span>
      </div>
    );
  }
  render() {
    const {currentYear, date, day, isDisabled, isMarked, isToday, isSelected, monthShort, theme, year} = this.props;

    return (
			<li
				style={(isToday) ? {color: theme.todayColor} : null}
				className={classNames(styles.root, {
  [styles.today]: isToday,
  [styles.selected]: isSelected,
  [styles.disabled]: isDisabled,
  [styles.enabled]: !isDisabled,
  [styles.marked]: isMarked,
})}
				onClick={this.handleClick}
        data-date={date}
			>
				{(day === 1) && <span className={styles.month}>{monthShort}</span>}
				{(isToday) ? <span>{day}</span> : day}
				{(day === 1 && currentYear !== year) && <span className={styles.year}>{year}</span>}
				{isSelected && this.renderSelection()}
			</li>
    );
  }
}
