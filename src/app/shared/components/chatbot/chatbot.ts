import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ChatService } from '../../../core/services/chat/chat.service';
import { ChatMessage, SuggestedAction } from '../../../core/models/chat/chat.model';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ─── State ───
  protected readonly isOpen = signal(false);
  protected readonly isSending = signal(false);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected inputText = '';
  private sessionId: string | null = null;
  private shouldScrollToBottom = false;
  private messageIdCounter = 0;

  // ─── Max message length (API constraint) ───
  private readonly MAX_MESSAGE_LENGTH = 1000;

  // ─── Toggle Panel ───
  protected toggleChat(): void {
    const wasOpen = this.isOpen();
    this.isOpen.set(!wasOpen);

    if (!wasOpen && this.messages().length === 0) {
      // First open → add welcome message
      this.addBotMessage(
        'Xin chào! Tôi là trợ lý AI của quán CF Manager Coffee. ' +
        'Tôi có thể giúp bạn xem menu, kiểm tra bàn trống, đặt bàn, xem doanh thu và nhiều thứ khác. Bạn cần gì ạ?',
        [
          { label: '📋 Xem menu', action: 'CHAT:Cho tôi xem menu' },
          { label: '🪑 Bàn trống', action: 'CHAT:Còn bàn trống không?' },
          { label: '📊 Doanh thu hôm nay', action: 'CHAT:Doanh thu hôm nay bao nhiêu?' },
          { label: '🔥 Món bán chạy', action: 'CHAT:Món nào bán chạy nhất?' },
        ]
      );
    }

    if (!wasOpen) {
      setTimeout(() => this.focusInput(), 100);
    }
  }

  // ─── Close Panel ───
  protected closeChat(): void {
    this.isOpen.set(false);
  }

  // ─── New Conversation ───
  protected newConversation(): void {
    this.sessionId = null;
    this.messages.set([]);
    this.inputText = '';
    this.isSending.set(false);

    this.addBotMessage(
      'Đã bắt đầu cuộc trò chuyện mới! Bạn cần hỏi gì ạ?',
      [
        { label: '📋 Xem menu', action: 'CHAT:Cho tôi xem menu' },
        { label: '🪑 Bàn trống', action: 'CHAT:Còn bàn trống không?' },
        { label: '📊 Doanh thu', action: 'CHAT:Doanh thu hôm nay bao nhiêu?' },
      ]
    );
  }

  // ─── Send Message ───
  protected sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isSending()) return;
    if (text.length > this.MAX_MESSAGE_LENGTH) return;

    this.inputText = '';
    this.doSend(text);
  }

  // ─── Handle Enter key ───
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ─── Handle Suggested Action click ───
  protected onActionClick(action: SuggestedAction): void {
    if (this.isSending()) return;

    const [prefix, ...rest] = action.action.split(':');
    const payload = rest.join(':');

    switch (prefix) {
      case 'CHAT':
        this.doSend(payload);
        break;
      case 'NAVIGATE':
        this.router.navigate([payload]);
        this.closeChat();
        break;
    }
  }

  // ─── Scroll after view update ───
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ─── Core send logic ───
  private doSend(text: string): void {
    // Add user message immediately (optimistic UI)
    this.addUserMessage(text);
    this.isSending.set(true);

    // Add loading indicator
    const loadingId = this.addLoadingMessage();

    // Build request
    const request = {
      message: text,
      ...(this.sessionId ? { sessionId: this.sessionId } : {}),
    };

    this.chatService
      .sendMessage(request)
      .pipe(
        finalize(() => {
          this.isSending.set(false);
          this.removeMessage(loadingId);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          // Save session
          if (response.sessionId) {
            this.sessionId = response.sessionId;
          }

          this.addBotMessage(response.reply, response.suggestedActions ?? null);
          this.focusInput();
        },
        error: (err) => {
          const status = err?.status;
          let errorMessage: string;

          if (status === 401) {
            errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          } else if (status === 403) {
            errorMessage = 'Bạn không có quyền sử dụng chức năng này.';
          } else if (status === 400) {
            errorMessage = err?.error?.message || 'Tin nhắn không hợp lệ.';
          } else if (status === 0 || !status) {
            errorMessage = 'Không thể kết nối server, vui lòng kiểm tra mạng.';
          } else {
            errorMessage = 'Hệ thống đang gặp sự cố, vui lòng thử lại sau.';
          }

          this.addBotMessage(errorMessage, null);
          this.focusInput();
        },
      });
  }

  // ─── Message helpers ───
  private addUserMessage(content: string): void {
    const msg: ChatMessage = {
      id: this.nextId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    this.messages.update((prev) => [...prev, msg]);
    this.shouldScrollToBottom = true;
  }

  private addBotMessage(content: string, actions: SuggestedAction[] | null): void {
    const msg: ChatMessage = {
      id: this.nextId(),
      role: 'bot',
      content,
      timestamp: new Date(),
      suggestedActions: actions,
    };
    this.messages.update((prev) => [...prev, msg]);
    this.shouldScrollToBottom = true;
  }

  private addLoadingMessage(): string {
    const id = this.nextId();
    const msg: ChatMessage = {
      id,
      role: 'bot',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    this.messages.update((prev) => [...prev, msg]);
    this.shouldScrollToBottom = true;
    return id;
  }

  private removeMessage(id: string): void {
    this.messages.update((prev) => prev.filter((m) => m.id !== id));
  }

  private nextId(): string {
    return `msg-${++this.messageIdCounter}-${Date.now()}`;
  }

  // ─── Format time ───
  protected formatTime(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  // ─── Remaining chars ───
  protected get remainingChars(): number {
    return this.MAX_MESSAGE_LENGTH - this.inputText.length;
  }

  protected get isOverLimit(): boolean {
    return this.remainingChars < 0;
  }

  // ─── DOM helpers ───
  private scrollToBottom(): void {
    const el = this.messageContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private focusInput(): void {
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 50);
  }
}
