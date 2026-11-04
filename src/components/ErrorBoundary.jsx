import { Component } from 'react';

/**
 * Last-resort guard: when rendering throws, show a readable fallback instead of
 * leaving an empty #root over the dark background — i.e. a silent black screen.
 *
 * @param {{ children: React.ReactNode }} props
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Countdown failed to render:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash" role="alert">
        <div className="crash__panel">
          <p className="crash__badge">Lỗi hiển thị</p>
          <h1 className="crash__title">Không tải được giao diện</h1>
          <p className="crash__body">
            Đã có lỗi khi dựng trang đếm ngược. Tải lại trang để thử lại; nếu vẫn lỗi,
            hãy xoá cache trình duyệt.
          </p>
          <button type="button" className="crash__btn" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
          <pre className="crash__detail">{String(error?.message ?? error)}</pre>
        </div>
      </div>
    );
  }
}
