import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatRequest, ChatResponse, ChatApiResponse } from '../../models/chat/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  /**
   * Gửi tin nhắn chat. Endpoint staff yêu cầu JWT (auto gắn bởi interceptor).
   * Interceptor đã prepend /api/v1, nên chỉ cần /chat/staff.
   */
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http
      .post<ChatApiResponse>('/chat/staff', request)
      .pipe(map((r) => r.data));
  }
}
